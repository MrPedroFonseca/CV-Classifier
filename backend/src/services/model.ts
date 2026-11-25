import { ModelRequestError } from "../errors/model-request-error.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const REQUEST_TIMEOUT_MS = 30_000;

interface GroqChatResponse {
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

// Sends a prompt to Groq with timeout handling and retries for transient failures.
export async function callModel(prompt: string): Promise<ModelResponse> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new ModelRequestError(500, "GROQ_API_KEY is not configured");
  }

  for (let attempt = 0; attempt <= 2; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
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
      throw new ModelRequestError(429, "Groq rate limit exceeded");
    }

    if (response.status >= 500) {
      if (attempt < 2) {
        await wait(500 * 2 ** attempt);
        continue;
      }
      throw new ModelRequestError(
        502,
        `Groq request failed with status ${response.status}`
      );
    }

    if (!response.ok) {
      throw new ModelRequestError(
        502,
        `Groq request failed with status ${response.status}`
      );
    }

    const payload = (await response.json()) as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new ModelRequestError(502, "Groq returned an empty response");
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
