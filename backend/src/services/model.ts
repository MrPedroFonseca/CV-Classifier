import { ModelRequestError } from "../errors/model-request-error.js";
import {
  getProvider,
  isProviderModelAllowed,
  type ProviderId
} from "../config/providers.js";

const REQUEST_TIMEOUT_MS = 30_000;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
}

export interface ModelResponse {
  text: string;
  tokens: number;
  timeMs: number;
}

// Waits briefly before retrying transient provider limits or server failures.
async function wait(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

// Sends a prompt to one configured provider with timeout handling and retries.
export async function callModel(
  prompt: string,
  providerId: ProviderId,
  model: string
): Promise<ModelResponse> {
  if (!isProviderModelAllowed(providerId, model)) {
    throw new ModelRequestError(
      400,
      "The selected provider and model combination is not allowed"
    );
  }

  const provider = getProvider(providerId);
  if (!provider) {
    throw new ModelRequestError(400, "The selected provider is not allowed");
  }

  const apiKey = process.env[provider.apiKeyEnvironmentName];
  if (!apiKey) {
    throw new ModelRequestError(
      400,
      `${provider.name} API key is not configured`
    );
  }

  for (let attempt = 0; attempt <= 2; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(provider.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: controller.signal
      });

      if (response.status === 429) {
        if (attempt < 2) {
          await wait(500 * 2 ** attempt);
          continue;
        }
        throw new ModelRequestError(
          429,
          `${provider.name} rate limit exceeded`
        );
      }

      if (response.status >= 500) {
        if (attempt < 2) {
          await wait(500 * 2 ** attempt);
          continue;
        }
        throw new ModelRequestError(
          502,
          `${provider.name} request failed with status ${response.status}`
        );
      }

      if (!response.ok) {
        throw new ModelRequestError(
          502,
          `${provider.name} request failed with status ${response.status}`
        );
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new ModelRequestError(
          502,
          `${provider.name} returned an empty response`
        );
      }

      return {
        text: content,
        tokens: payload.usage?.total_tokens ?? 0,
        timeMs: Date.now() - startedAt
      };
    } catch (error) {
      if (error instanceof ModelRequestError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ModelRequestError(504, "Model request timed out");
      }

      throw new ModelRequestError(502, "Unable to reach the model provider");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ModelRequestError(502, "Unable to reach the model provider");
}
