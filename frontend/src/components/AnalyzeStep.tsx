import type { ChangeEvent, FormEventHandler } from "react";
import type { ProviderId, ProviderOption } from "../types";
import { StepHeading } from "./StepHeading";
import "./AnalyzeStep.css";

interface AnalyzeStepProps {
  advertisement: string;
  provider: ProviderId | "";
  model: string;
  providers: ProviderOption[];
  loadingModels: boolean;
  analyzing: boolean;
  canAnalyze: boolean;
  hasResume: boolean;
  onAdvertisementChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onProviderChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onModelChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onAnalyze: FormEventHandler<HTMLFormElement>;
}

// Collects the job advertisement and selection of an available AI model.
export function AnalyzeStep({
  advertisement,
  provider,
  model,
  providers,
  loadingModels,
  analyzing,
  canAnalyze,
  hasResume,
  onAdvertisementChange,
  onProviderChange,
  onModelChange,
  onAnalyze
}: AnalyzeStepProps) {
  const selectedModels =
    providers.find((item) => item.id === provider)?.models ?? [];

  return (
    <form className="panel analysis-panel" onSubmit={onAnalyze}>
      <StepHeading
        number={3}
        title="Analyze a job"
        description="Paste the full job description to get your match report."
      />

      <label className="field-label" htmlFor="advertisement">
        Job advertisement
      </label>
      <textarea
        id="advertisement"
        className="text-input advertisement-input"
        value={advertisement}
        maxLength={15_000}
        onChange={onAdvertisementChange}
        placeholder="Paste the job advertisement here..."
        rows={8}
      />
      <div className="form-footer">
        <span className="character-count">
          {advertisement.length.toLocaleString()} / 15,000
        </span>
        <div className="model-controls">
          <label className="select-shell">
            <span className="visually-hidden">AI provider</span>
            <select
              className="select-input"
              value={provider}
              onChange={onProviderChange}
              disabled={loadingModels || providers.length === 0}
            >
              {providers.length === 0 && (
                <option value="">No providers</option>
              )}
              {/* Shows only providers whose keys are configured on the backend. */}
              {providers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id === "gemini" ? "Google Gemini" : "Groq"}
                </option>
              ))}
            </select>
          </label>
          <label className="select-shell">
            <span className="visually-hidden">AI model</span>
            <select
              className="select-input"
              value={model}
              onChange={onModelChange}
              disabled={loadingModels || selectedModels.length === 0}
            >
              {/* Lists models allowed for the selected provider. */}
              {selectedModels.map((availableModel) => (
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
              <>
                Analyze job <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </div>
      {!hasResume && (
        <p className="inline-hint">
          Prepare a resume above to enable job analysis.
        </p>
      )}
    </form>
  );
}
