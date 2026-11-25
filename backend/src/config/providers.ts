export type ProviderId = "groq" | "gemini";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiUrl: string;
  apiKeyEnvironmentName: string;
  models: readonly string[];
}

// Centralizes provider details so provider changes do not require route changes.
export const providers: readonly ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnvironmentName: "GROQ_API_KEY",
    models: ["openai/gpt-oss-120b"]
  },
  {
    id: "gemini",
    name: "Google Gemini",
    apiUrl:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiKeyEnvironmentName: "GEMINI_API_KEY",
    models: ["gemini-3.6-flash"]
  }
] as const;

// Finds one provider and its allowed configuration by provider ID.
export function getProvider(providerId: ProviderId): ProviderConfig | undefined {
  return providers.find((provider) => provider.id === providerId);
}

// Checks whether a model belongs to the provider allowlist.
export function isProviderModelAllowed(
  providerId: ProviderId,
  model: string
): boolean {
  const provider = getProvider(providerId);
  return provider?.models.includes(model) ?? false;
}

// Lists only providers that currently have their API key configured.
export function getConfiguredProviders(): ProviderConfig[] {
  return providers.filter((provider) => {
    const apiKey = process.env[provider.apiKeyEnvironmentName];
    return Boolean(apiKey);
  });
}
