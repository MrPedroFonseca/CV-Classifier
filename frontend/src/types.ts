export type ProviderId = "groq" | "gemini";
export type WorkModel = "remote" | "hybrid" | "on-site";
export type FitStatus = "compatible" | "incompatible" | "unknown";

export interface ProviderOption {
  id: ProviderId;
  models: string[];
}

export interface WorkLocation {
  city: string;
  maxDays: number;
}

export interface WorkPreferences {
  models: WorkModel[];
  locations: WorkLocation[];
}

export interface AnalysisResult {
  title: string;
  experienceYears: string | null;
  technologies: string[];
  workModel: WorkModel | null;
  salary: string | null;
  compatibility: number;
  gaps: string[];
  preferences: {
    workModel: FitStatus;
    location: FitStatus;
  };
  meta: {
    timeMs: number;
    tokens: number;
  };
}
