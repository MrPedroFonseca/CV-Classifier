import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  analyzeAdvertisement,
  extractResume,
  getAvailableModels
} from "./api";
import { AnalysisResult } from "./components/AnalysisResult";
import { AnalyzeStep } from "./components/AnalyzeStep";
import { PreferencesStep } from "./components/PreferencesStep";
import { ResumeStep } from "./components/ResumeStep";
import { removeResumeContactDetails } from "./privacy";
import { readSavedSettings, saveSettings } from "./storage";
import type {
  AnalysisResult as AnalysisResultData,
  ProviderId,
  ProviderOption,
  WorkLocation,
  WorkModel,
  WorkPreferences
} from "./types";
import "./App.css";

const MAX_ADVERTISEMENT_LENGTH = 15_000;
const MAX_RESUME_LENGTH = 10_000;
const MAX_PDF_SIZE = 2 * 1024 * 1024;

// Coordinates resume setup, preferences, model selection, and job analysis.
function App() {
  const [initialSettings] = useState(readSavedSettings);
  const [resumeSource, setResumeSource] = useState("");
  const [resume, setResume] = useState(initialSettings.resume);
  const [preferences, setPreferences] = useState<WorkPreferences>(
    initialSettings.preferences
  );
  const [advertisement, setAdvertisement] = useState("");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState<ProviderId | "">("");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialSettings.warning);
  const [loadingModels, setLoadingModels] = useState(true);
  const [extractingResume, setExtractingResume] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy JSON");
  const fileInput = useRef<HTMLInputElement>(null);

  // Loads configured models and cancels the request when the app unmounts.
  useEffect(() => {
    const controller = new AbortController();

    async function loadModels(): Promise<void> {
      try {
        const availableProviders = await getAvailableModels(controller.signal);
        setProviders(availableProviders);
        if (availableProviders.length > 0) {
          setProvider(availableProviders[0].id);
          setModel(availableProviders[0].models[0] ?? "");
        } else {
          setError(
            "No AI providers are configured. Add a provider API key to the backend environment."
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load available AI models"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingModels(false);
        }
      }
    }

    void loadModels();
    return () => controller.abort();
  }, []);

  // Saves the reviewed resume and preferences locally and reports storage errors.
  function persistSettings(
    nextResume: string,
    nextPreferences: WorkPreferences
  ): void {
    try {
      saveSettings(nextResume, nextPreferences);
    } catch {
      setError("Browser storage is unavailable. Your settings will not persist.");
    }
  }

  // Updates reviewed resume state and browser storage together.
  function updateResume(nextResume: string): void {
    setResume(nextResume);
    persistSettings(nextResume, preferences);
  }

  // Updates work preferences and browser storage together.
  function updatePreferences(nextPreferences: WorkPreferences): void {
    setPreferences(nextPreferences);
    persistSettings(resume, nextPreferences);
  }

  // Removes contact details from pasted resume text before the user reviews it.
  function handlePrepareResume(): void {
    const cleanedResume = removeResumeContactDetails(resumeSource);
    if (!cleanedResume) {
      setError("Paste resume text before preparing it for review.");
      return;
    }
    updateResume(cleanedResume);
    setError("");
    setNotice("Review and edit the exact resume text that will be sent.");
  }

  // Updates the unprocessed resume text pasted by the user.
  function handleResumeSourceChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ): void {
    setResumeSource(event.target.value);
  }

  // Saves edits to the exact resume text that will be sent for analysis.
  function handleReviewedResumeChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ): void {
    updateResume(event.target.value);
  }

  // Extracts PDF text and places the cleaned result in the review field.
  async function handlePdfUpload(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setError("The PDF must be 2 MB or smaller.");
      return;
    }

    setExtractingResume(true);
    setError("");
    try {
      const extractedText = await extractResume(file);
      updateResume(extractedText);
      setResumeSource("");
      setNotice("PDF text extracted. Review or edit it before analyzing.");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not extract text from the PDF";
      setError(
        message.includes("no extractable text")
          ? `${message}. Paste the resume text instead.`
          : message
      );
    } finally {
      setExtractingResume(false);
    }
  }

  // Clears the resume from state and browser storage.
  function handleClearResume(): void {
    updateResume("");
    setResumeSource("");
    setNotice("Resume removed from this browser.");
    setError("");
  }

  // Adds or removes one accepted work model.
  function handleWorkModelChange(
    selectedModel: WorkModel,
    checked: boolean
  ): void {
    updatePreferences({
      ...preferences,
      models: checked
        ? [...new Set([...preferences.models, selectedModel])]
        : preferences.models.filter((item) => item !== selectedModel)
    });
  }

  // Adds a location row for the user to configure.
  function handleAddLocation(): void {
    updatePreferences({
      ...preferences,
      locations: [...preferences.locations, { city: "", maxDays: 0 }]
    });
  }

  // Updates a location name or its maximum office days per week.
  function handleLocationChange(
    index: number,
    field: keyof WorkLocation,
    value: string
  ): void {
    updatePreferences({
      ...preferences,
      locations: preferences.locations.map((location, locationIndex) => {
        if (locationIndex !== index) {
          return location;
        }
        return field === "city"
          ? { ...location, city: value }
          : {
              ...location,
              maxDays: Math.max(0, Math.min(7, Number(value) || 0))
            };
      })
    });
  }

  // Removes one location from the saved preferences.
  function handleRemoveLocation(index: number): void {
    updatePreferences({
      ...preferences,
      locations: preferences.locations.filter(
        (_location, locationIndex) => locationIndex !== index
      )
    });
  }

  // Changes the provider and selects its first available model.
  function handleProviderChange(event: ChangeEvent<HTMLSelectElement>): void {
    const selectedValue = event.target.value;
    if (selectedValue !== "groq" && selectedValue !== "gemini") {
      return;
    }

    const selectedProvider: ProviderId = selectedValue;
    const providerOption = providers.find(
      (item) => item.id === selectedProvider
    );
    setProvider(selectedProvider);
    setModel(providerOption?.models[0] ?? "");
  }

  // Updates the selected model for the current provider.
  function handleModelChange(event: ChangeEvent<HTMLSelectElement>): void {
    setModel(event.target.value);
  }

  // Opens the hidden PDF input when the upload button is selected.
  function handleChooseFile(): void {
    fileInput.current?.click();
  }

  // Updates the advertisement as the user edits its text.
  function handleAdvertisementChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ): void {
    setAdvertisement(event.target.value);
  }

  // Validates input and submits the analysis request to the selected model.
  async function handleAnalyze(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setNotice("");
    setResult(null);

    if (!resume.trim()) {
      setError("Prepare and review a resume before analyzing an advertisement.");
      return;
    }
    const cleanedResume = removeResumeContactDetails(resume);
    if (cleanedResume !== resume) {
      updateResume(cleanedResume);
      setError(
        "Contact details were removed. Review the updated resume text before analyzing."
      );
      return;
    }
    if (!advertisement.trim()) {
      setError("Paste a job advertisement before analyzing.");
      return;
    }
    if (resume.length > MAX_RESUME_LENGTH) {
      setError("The reviewed resume must be 10,000 characters or fewer.");
      return;
    }
    if (advertisement.length > MAX_ADVERTISEMENT_LENGTH) {
      setError("The advertisement must be 15,000 characters or fewer.");
      return;
    }
    if (!provider || !model) {
      setError("Select an available AI provider and model.");
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await analyzeAdvertisement({
        advertisement,
        resume,
        preferences: {
          models: preferences.models,
          locations: preferences.locations.filter(
            (location) => location.city.trim().length > 0
          )
        },
        provider,
        model
      });
      setResult(analysis);
      setNotice("Analysis complete.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The analysis request failed"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // Copies the validated analysis as formatted JSON to the clipboard.
  async function handleCopyResult(): Promise<void> {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy JSON"), 1800);
    } catch {
      setError("Could not copy the result. Check clipboard permissions.");
    }
  }

  const canAnalyze =
    resume.trim().length > 0 &&
    advertisement.trim().length > 0 &&
    resume.length <= MAX_RESUME_LENGTH &&
    advertisement.length <= MAX_ADVERTISEMENT_LENGTH &&
    Boolean(provider && model) &&
    !analyzing &&
    !extractingResume;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="JobFit home">
          <span className="brand-mark">J</span>
          <span>JobFit</span>
        </a>
        <span className="privacy-badge">
          <span className="status-dot" />
          Resume stays in your browser
        </span>
      </header>

      <section className="intro">
        <p className="eyebrow">AI-POWERED JOB ANALYSIS</p>
        <h1>Find your fit.</h1>
        <p className="intro-copy">
          Compare a job opportunity with your experience and work preferences.
          Review your resume before it is sent to an AI provider.
        </p>
      </section>

      <div className="workspace">
        <ResumeStep
          resumeSource={resumeSource}
          resume={resume}
          extractingResume={extractingResume}
          fileInput={fileInput}
          onResumeSourceChange={handleResumeSourceChange}
          onPrepareResume={handlePrepareResume}
          onPdfUpload={handlePdfUpload}
          onChooseFile={handleChooseFile}
          onClearResume={handleClearResume}
          onReviewedResumeChange={handleReviewedResumeChange}
        />
        <PreferencesStep
          preferences={preferences}
          onWorkModelChange={handleWorkModelChange}
          onAddLocation={handleAddLocation}
          onLocationChange={handleLocationChange}
          onRemoveLocation={handleRemoveLocation}
        />
      </div>

      <AnalyzeStep
        advertisement={advertisement}
        provider={provider}
        model={model}
        providers={providers}
        loadingModels={loadingModels}
        analyzing={analyzing}
        canAnalyze={canAnalyze}
        hasResume={Boolean(resume.trim())}
        onAdvertisementChange={handleAdvertisementChange}
        onProviderChange={handleProviderChange}
        onModelChange={handleModelChange}
        onAnalyze={handleAnalyze}
      />

      {(error || notice) && (
        <div
          className={`feedback ${error ? "feedback-error" : "feedback-notice"}`}
          role={error ? "alert" : "status"}
        >
          <span aria-hidden="true">{error ? "!" : "✓"}</span>
          {error || notice}
        </div>
      )}

      {result && (
        <AnalysisResult
          result={result}
          copyLabel={copyLabel}
          onCopyResult={handleCopyResult}
        />
      )}

      <footer className="page-footer">
        <span>JobFit</span>
        <span>
          Your reviewed resume is sent to the selected AI provider only when you
          request an analysis. PDF uploads are processed for text extraction
          and are not stored by the backend. Free-tier providers may process
          requests under their terms.
        </span>
      </footer>
    </main>
  );
}

export default App;
