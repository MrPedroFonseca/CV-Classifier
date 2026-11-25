import type {
  AnalysisResult,
  ProviderId,
  ProviderOption,
  WorkPreferences,
  WorkModel,
  FitStatus
} from "./types";

export interface AnalysisRequest {
  advertisement: string;
  resume: string;
  preferences: WorkPreferences;
  provider: ProviderId;
  model: string;
}

// Reads a useful error message from a failed API response.
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      if (
        "details" in body &&
        Array.isArray(body.details) &&
        body.details.every((detail) => typeof detail === "string")
      ) {
        return `${body.error}: ${body.details.join("; ")}`;
      }
      return body.error;
    }
  } catch {
    return `Request failed (${response.status})`;
  }

  return `Request failed (${response.status})`;
}

// Checks whether an unknown value is an array containing only strings.
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Checks whether an API provider ID is supported by this frontend.
function isProviderId(value: unknown): value is ProviderId {
  return value === "groq" || value === "gemini";
}

// Checks whether a value is one of the work models used by the API.
function isWorkModel(value: unknown): value is WorkModel {
  return value === "remote" || value === "hybrid" || value === "on-site";
}

// Checks whether a value is a valid preference fit status.
function isFitStatus(value: unknown): value is FitStatus {
  return (
    value === "compatible" ||
    value === "incompatible" ||
    value === "unknown"
  );
}

// Loads providers and models that have API keys configured on the backend.
export async function getAvailableModels(
  signal: AbortSignal
): Promise<ProviderOption[]> {
  const response = await fetch("/models", { signal });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("providers" in body) ||
    !Array.isArray(body.providers)
  ) {
    throw new Error("The server returned an invalid provider list");
  }

  return body.providers.map((provider): ProviderOption => {
    if (
      typeof provider !== "object" ||
      provider === null ||
      !("id" in provider) ||
      !isProviderId(provider.id) ||
      !("models" in provider) ||
      !isStringArray(provider.models) ||
      provider.models.length === 0
    ) {
      throw new Error("The server returned an invalid provider configuration");
    }
    return { id: provider.id, models: provider.models };
  });
}

// Uploads a PDF resume and returns extracted text with detectable contacts removed.
export async function extractResume(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("pdf", file);

  const response = await fetch("/resume/extract", {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("text" in body) ||
    typeof body.text !== "string"
  ) {
    throw new Error("The server returned invalid resume text");
  }
  return body.text;
}

// Sends the reviewed resume, advertisement, preferences, and selected model for analysis.
export async function analyzeAdvertisement(
  input: AnalysisRequest
): Promise<AnalysisResult> {
  const response = await fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string" ||
    !("experienceYears" in body) ||
    !(typeof body.experienceYears === "string" || body.experienceYears === null) ||
    !("technologies" in body) ||
    !isStringArray(body.technologies) ||
    !("workModel" in body) ||
    !(body.workModel === null || isWorkModel(body.workModel)) ||
    !("salary" in body) ||
    !(typeof body.salary === "string" || body.salary === null) ||
    !("compatibility" in body) ||
    typeof body.compatibility !== "number" ||
    !Number.isInteger(body.compatibility) ||
    body.compatibility < 0 ||
    body.compatibility > 10 ||
    !("gaps" in body) ||
    !isStringArray(body.gaps) ||
    !("preferences" in body) ||
    typeof body.preferences !== "object" ||
    body.preferences === null ||
    !("workModel" in body.preferences) ||
    !isFitStatus(body.preferences.workModel) ||
    !("location" in body.preferences) ||
    !isFitStatus(body.preferences.location) ||
    !("meta" in body) ||
    typeof body.meta !== "object" ||
    body.meta === null ||
    !("timeMs" in body.meta) ||
    typeof body.meta.timeMs !== "number" ||
    !Number.isFinite(body.meta.timeMs) ||
    !("tokens" in body.meta) ||
    typeof body.meta.tokens !== "number" ||
    !Number.isFinite(body.meta.tokens)
  ) {
    throw new Error("The server returned an invalid analysis result");
  }

  return {
    title: body.title,
    experienceYears: body.experienceYears,
    technologies: body.technologies,
    workModel: body.workModel,
    salary: body.salary,
    compatibility: body.compatibility,
    gaps: body.gaps,
    preferences: {
      workModel: body.preferences.workModel,
      location: body.preferences.location
    },
    meta: {
      timeMs: body.meta.timeMs,
      tokens: body.meta.tokens
    }
  };
}
