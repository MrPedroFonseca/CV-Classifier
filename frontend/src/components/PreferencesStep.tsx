import type { WorkLocation, WorkModel, WorkPreferences } from "../types";
import { StepHeading } from "./StepHeading";
import "./PreferencesStep.css";

interface PreferencesStepProps {
  preferences: WorkPreferences;
  onWorkModelChange: (model: WorkModel, checked: boolean) => void;
  onAddLocation: () => void;
  onLocationChange: (
    index: number,
    field: keyof WorkLocation,
    value: string
  ) => void;
  onRemoveLocation: (index: number) => void;
}

const WORK_MODELS: WorkModel[] = ["remote", "hybrid", "on-site"];

// Collects optional work-model and location preferences.
export function PreferencesStep({
  preferences,
  onWorkModelChange,
  onAddLocation,
  onLocationChange,
  onRemoveLocation
}: PreferencesStepProps) {
  return (
    <section className="panel preferences-panel">
      <StepHeading
        number={2}
        title="Work preferences"
        description="Optional. Leave empty to accept any arrangement."
      />

      <fieldset className="preference-group">
        <legend>Accepted work models</legend>
        <div className="choice-row">
          {/* Shows one checkbox for each supported work model. */}
          {WORK_MODELS.map((workModel) => (
            <label className="check-choice" key={workModel}>
              <input
                type="checkbox"
                checked={preferences.models.includes(workModel)}
                onChange={(event) =>
                  onWorkModelChange(workModel, event.target.checked)
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
          onClick={onAddLocation}
        >
          + Add location
        </button>
      </div>
      {preferences.locations.length === 0 ? (
        <p className="empty-hint">No location limits added.</p>
      ) : (
        <div className="location-list">
          {/* Keeps each city's office-day preference editable and removable. */}
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
                  onLocationChange(index, "city", event.target.value)
                }
                placeholder="City"
              />
              <label className="visually-hidden" htmlFor={`days-${index}`}>
                Maximum office days per week
              </label>
              <input
                id={`days-${index}`}
                className="text-input days-input"
                type="number"
                min={2}
                max={5}
                step={1}
                value={location.maxDays}
                onChange={(event) =>
                  onLocationChange(index, "maxDays", event.target.value)
                }
              />
              <span className="days-label">days / week</span>
              <button
                className="remove-location"
                type="button"
                onClick={() => onRemoveLocation(index)}
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
  );
}
