import type { WorkLocation, WorkPreferences } from "./types";

const STORAGE_KEY = "job-analyzer-settings";

export interface SavedSettings {
  resume: string;
  preferences: WorkPreferences;
  warning: string;
}

const emptyPreferences: WorkPreferences = {
  models: [],
  locations: []
};

// Checks that saved location data can be safely restored.
function isStoredLocation(value: unknown): value is WorkLocation {
  return (
    typeof value === "object" &&
    value !== null &&
    "city" in value &&
    typeof value.city === "string" &&
    "maxDays" in value &&
    typeof value.maxDays === "number" &&
    Number.isFinite(value.maxDays)
  );
}

// Clamps older saved office-day values to the current 2-to-5 day range.
function normalizeSavedLocations(locations: WorkLocation[]): WorkLocation[] {
  return locations.map((location) => ({
    ...location,
    maxDays: Math.max(2, Math.min(5, Math.round(location.maxDays)))
  }));
}

// Restores the reviewed resume and work preferences from this browser only.
export function readSavedSettings(): SavedSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { resume: "", preferences: emptyPreferences, warning: "" };
    }

    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Saved settings have an unexpected format");
    }

    const record = parsed as Record<string, unknown>;
    const preferences = record.preferences;
    if (
      typeof record.resume !== "string" ||
      typeof preferences !== "object" ||
      preferences === null
    ) {
      throw new Error("Saved settings have an unexpected format");
    }

    const preferenceRecord = preferences as Record<string, unknown>;
    const models = preferenceRecord.models;
    const locations = preferenceRecord.locations;
    if (
      !Array.isArray(models) ||
      !models.every(
        (model) =>
          model === "remote" || model === "hybrid" || model === "on-site"
      ) ||
      !Array.isArray(locations) ||
      !locations.every(isStoredLocation)
    ) {
      throw new Error("Saved preferences have an unexpected format");
    }

    return {
      resume: record.resume,
      preferences: {
        models,
        locations: normalizeSavedLocations(locations)
      },
      warning: ""
    };
  } catch {
    return {
      resume: "",
      preferences: emptyPreferences,
      warning: "Saved settings could not be read. You can enter them again."
    };
  }
}

// Saves the reviewed resume and preferences locally without sending them to a server.
export function saveSettings(
  resume: string,
  preferences: WorkPreferences
): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ resume, preferences }));
}
