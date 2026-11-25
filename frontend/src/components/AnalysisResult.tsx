import type { AnalysisResult as AnalysisResultData } from "../types";
import "./AnalysisResult.css";

interface AnalysisResultProps {
  result: AnalysisResultData;
  copyLabel: string;
  onCopyResult: () => void;
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

// Presents the structured analysis, compatibility score, gaps, and model metadata.
export function AnalysisResult({
  result,
  copyLabel,
  onCopyResult
}: AnalysisResultProps) {
  return (
    <section className="panel result-panel" aria-live="polite">
      <div className="result-header">
        <div className="section-heading">
          <span className="step-number result-step" aria-hidden="true">
            ✓
          </span>
          <div>
            <p className="eyebrow">ANALYSIS RESULT</p>
            <h2>{result.title}</h2>
          </div>
        </div>
        <button
          className="button button-secondary copy-button"
          type="button"
          onClick={onCopyResult}
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
              {/* Presents each technology identified in the advertisement. */}
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
              {/* Lists requirements that the resume does not demonstrate. */}
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
  );
}
