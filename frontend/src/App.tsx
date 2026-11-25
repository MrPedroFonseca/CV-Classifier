import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  analyzeAdvertisement,
  extractResume,
  getAvailableModels
} from "./api";
import { removeResumeContactDetails } from "./privacy";
import { readSavedSettings, saveSettings } from "./storage";
import type {
  AnalysisResult,
  ProviderId,
  ProviderOption,
  WorkLocation,
  WorkModel,
  WorkPreferences
} from "./types";
import "./App.css";

const WORK_MODELS: WorkModel[] = ["remote", "hybrid", "on-site"];
const MAX_ADVERTISEMENT_LENGTH = 15_000;
const MAX_RESUME_LENGTH = 10_000;
const MAX_PDF_SIZE = 2 * 1024 * 1024;
// Renders the job analyzer and keeps personal settings in browser storage.
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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialSettings.warning);
  const [loadingModels, setLoadingModels] = useState(true);
  const [extractingResume, setExtractingResume] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy JSON");
  const fileInput = useRef<HTMLInputElement>(null);

  // Loads currently configured providers and cancels the request when the page unmounts.
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

  // Saves updated settings locally and reports browser storage failures.
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

  // Updates the reviewed resume in both React state and browser storage.
  function updateResume(nextResume: string): void {
    setResume(nextResume);
    persistSettings(nextResume, preferences);
  }

  // Updates preferences in both React state and browser storage.
  function updatePreferences(nextPreferences: WorkPreferences): void {
    setPreferences(nextPreferences);
    persistSettings(resume, nextPreferences);
  }

  // Prepares pasted resume text by removing detectable contact details for review.
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

  // Updates the source text before contact removal and review.
  function handleResumeSourceChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ): void {
    setResumeSource(event.target.value);
  }

  // Saves edits made to the exact resume text that will be sent.
  function handleReviewedResumeChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ): void {
    updateResume(event.target.value);
  }

  // Extracts a selected PDF and places the cleaned text in the review field.
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

  // Clears the saved resume so it is removed from browser storage.
  function handleClearResume(): void {
    updateResume("");
    setResumeSource("");
    setNotice("Resume removed from this browser.");
    setError("");
  }

  // Updates one accepted work model in the user's preferences.
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

  // Adds an empty location preference for the user to configure.
  function handleAddLocation(): void {
    updatePreferences({
      ...preferences,
      locations: [...preferences.locations, { city: "", maxDays: 0 }]
    });
  }

  // Updates one city or office-day limit without changing other preferences.
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

  // Removes a location from the user's saved work preferences.
  function handleRemoveLocation(index: number): void {
    updatePreferences({
      ...preferences,
      locations: preferences.locations.filter(
        (_location, locationIndex) => locationIndex !== index
      )
    });
  }

  // Changes the selected provider and selects its first available model.
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

  // Opens the hidden PDF file input after the user selects the upload action.
  function handleChooseFile(): void {
    fileInput.current?.click();
  }

  // Validates input and submits one analysis using the currently selected model.
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

  // Copies the validated result as formatted JSON to the clipboard.
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

  // Returns the selected provider's models for the model selector.
  function getSelectedModels(): string[] {
    return providers.find((item) => item.id === provider)?.models ?? [];
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
        <section className="panel resume-panel">
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Your resume</h2>
              <p>Prepare it once. It stays in this browser.</p>
            </div>
          </div>

          <label className="field-label" htmlFor="resume-source">
            Paste resume text
          </label>
          <textarea
            id="resume-source"
            className="text-input resume-source"
            value={resumeSource}
            maxLength={MAX_RESUME_LENGTH}
            onChange={handleResumeSourceChange}
            placeholder="Paste your resume text here..."
            rows={5}
          />
          <div className="resume-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={handlePrepareResume}
            >
              Remove contacts and review
            </button>
            <span className="character-count">
              {resumeSource.length.toLocaleString()} / 10,000
            </span>
          </div>

          <div className="upload-row">
            <span className="or-divider">or</span>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handlePdfUpload}
              aria-label="Upload resume PDF"
            />
            <button
              className="button button-upload"
              type="button"
              onClick={handleChooseFile}
              disabled={extractingResume}
            >
              {extractingResume ? "Extracting PDF..." : "Upload a PDF"}
            </button>
            <span className="upload-hint">PDF, up to 2 MB</span>
          </div>

          {resume && (
            <div className="review-block">
              <div className="review-heading">
                <label className="field-label" htmlFor="resume-reviewed">
                  Reviewed text sent for analysis
                </label>
                <button
                  className="text-button"
                  type="button"
                  onClick={handleClearResume}
                >
                  Remove resume
                </button>
              </div>
              <textarea
                id="resume-reviewed"
                className="text-input reviewed-resume"
                value={resume}
                maxLength={MAX_RESUME_LENGTH}
                onChange={handleReviewedResumeChange}
                rows={7}
              />
              <span className="character-count right-count">
                {resume.length.toLocaleString()} / 10,000
              </span>
            </div>
          )}
        </section>

        <section className="panel preferences-panel">
          <div className="section-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Work preferences</h2>
              <p>Optional. Leave empty to accept any arrangement.</p>
            </div>
          </div>

          <fieldset className="preference-group">
            <legend>Accepted work models</legend>
            <div className="choice-row">
              {WORK_MODELS.map((workModel) => (
                <label className="check-choice" key={workModel}>
                  <input
                    type="checkbox"
                    checked={preferences.models.includes(workModel)}
                    onChange={(event) =>
                      handleWorkModelChange(workModel, event.target.checked)
                    }
                  />
                  <span>{workModel}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="location-heading">
            <span className="field-label">Preferred locations</span>
            <button
              className="text-button add-location"
              type="button"
              onClick={handleAddLocation}
            >
              + Add location
            </button>
          </div>
          {preferences.locations.length === 0 ? (
            <p className="empty-hint">No location limits added.</p>
          ) : (
            <div className="location-list">
              {preferences.locations.map((location, index) => (
                <div className="location-row" key={`location-${index}`}>
                  <label className="visually-hidden" htmlFor={`city-${index}`}>
                    City
                  </label>
                  <input
                    id={`city-${index}`}
                    className="text-input city-input"
                    value={location.city}
                    onChange={(event) =>
                      handleLocationChange(index, "city", event.target.value)
                    }
                    placeholder="City"
                  />
                  <label
                    className="visually-hidden"
                    htmlFor={`days-${index}`}
                  >
                    Maximum office days per week
                  </label>
                  <input
                    id={`days-${index}`}
                    className="text-input days-input"
                    type="number"
                    min={0}
                    max={7}
                    value={location.maxDays}
                    onChange={(event) =>
                      handleLocationChange(index, "maxDays", event.target.value)
                    }
                  />
                  <span className="days-label">days / week</span>
                  <button
                    className="remove-location"
                    type="button"
                    onClick={() => handleRemoveLocation(index)}
                    aria-label={`Remove ${location.city || "location"}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="privacy-note">
            Preferences are also stored only in this browser.
          </p>
        </section>
      </div>

      <form className="panel analysis-panel" onSubmit={handleAnalyze}>
        <div className="section-heading">
          <span className="step-number">03</span>
          <div>
            <h2>Analyze a job</h2>
            <p>Paste the full job description to get your match report.</p>
          </div>
        </div>

        <label className="field-label" htmlFor="advertisement">
          Job advertisement
        </label>
        <textarea
          id="advertisement"
          className="text-input advertisement-input"
          value={advertisement}
          maxLength={MAX_ADVERTISEMENT_LENGTH}
          onChange={(event) => setAdvertisement(event.target.value)}
          placeholder="Paste the job advertisement here..."
          rows={8}
        />
        <div className="form-footer">
          <span className="character-count">
            {advertisement.length.toLocaleString()} / 15,000
          </span>
          <div className="model-controls">
            <label>
              <span className="visually-hidden">AI provider</span>
              <select
                className="select-input"
                value={provider}
                onChange={handleProviderChange}
                disabled={loadingModels || providers.length === 0}
              >
                {providers.length === 0 && <option value="">No providers</option>}
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id === "gemini" ? "Google Gemini" : "Groq"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">AI model</span>
              <select
                className="select-input"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                disabled={loadingModels || getSelectedModels().length === 0}
              >
                {getSelectedModels().map((availableModel) => (
                  <option key={availableModel} value={availableModel}>
                    {availableModel}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={!canAnalyze}
            >
              {analyzing ? (
                <>
                  <span className="spinner" />
                  Analyzing...
                </>
              ) : (
                <>Analyze job <span aria-hidden="true">→</span></>
              )}
            </button>
          </div>
        </div>
        {!resume.trim() && (
          <p className="inline-hint">
            Prepare a resume above to enable job analysis.
          </p>
        )}
      </form>

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
        <section className="panel result-panel" aria-live="polite">
          <div className="result-header">
            <div className="section-heading">
              <span className="step-number result-step">✓</span>
              <div>
                <p className="eyebrow">ANALYSIS RESULT</p>
                <h2>{result.title}</h2>
              </div>
            </div>
            <button
              className="button button-secondary copy-button"
              type="button"
              onClick={handleCopyResult}
            >
              {copyLabel}
            </button>
          </div>

          <div className="score-and-facts">
            <div className="score-card">
              <span className="score-value">{result.compatibility}</span>
              <span className="score-total">/ 10</span>
              <span className="score-caption">Compatibility</span>
            </div>
            <div className="fact-grid">
              <ResultFact label="Experience" value={result.experienceYears} />
              <ResultFact label="Work model" value={result.workModel} />
              <ResultFact label="Salary" value={result.salary} />
              <ResultFact
                label="Work preference"
                value={result.preferences.workModel}
              />
              <ResultFact
                label="Location preference"
                value={result.preferences.location}
              />
            </div>
          </div>

          <div className="result-columns">
            <div className="result-section">
              <h3>Technologies</h3>
              {result.technologies.length > 0 ? (
                <div className="tag-list">
                  {result.technologies.map((technology) => (
                    <span className="tag" key={technology}>
                      {technology}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted-result">None identified</p>
              )}
            </div>
            <div className="result-section">
              <h3>Gaps to consider</h3>
              {result.gaps.length > 0 ? (
                <ul className="gap-list">
                  {result.gaps.map((gap, index) => (
                    <li key={`${gap}-${index}`}>{gap}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted-result">No gaps identified</p>
              )}
            </div>
          </div>

          <footer className="result-meta">
            <span>Response time: {(result.meta.timeMs / 1000).toFixed(1)}s</span>
            <span>{result.meta.tokens.toLocaleString()} tokens</span>
          </footer>
        </section>
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

interface ResultFactProps {
  label: string;
  value: string | null;
}

// Displays one labeled analysis field with an explicit unknown fallback.
function ResultFact({ label, value }: ResultFactProps) {
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value || "Not specified"}</span>
    </div>
  );
}

export default App;
