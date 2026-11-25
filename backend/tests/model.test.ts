import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { callModel } from "../src/services/model.js";

const originalGroqKey = process.env.GROQ_API_KEY;

// Configures a fake provider key so model tests never need external secrets.
beforeEach(() => {
  process.env.GROQ_API_KEY = "test-groq-key";
});

// Restores timers, mocked globals, and provider configuration after each test.
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalGroqKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalGroqKey;
  }
});

describe("callModel retry and timeout handling", () => {
  // Retries rate-limit and server errors with the configured increasing delays.
  it("retries 429 and 5xx responses before returning a successful response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"title":"Developer"}' } }],
            usage: { total_tokens: 18 }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = callModel(
      "Analyze this job",
      "groq",
      "openai/gpt-oss-120b"
    );

    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toMatchObject({
      text: '{"title":"Developer"}',
      tokens: 18
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // Converts an aborted provider request into the documented timeout error.
  it("returns a timeout error when the request is aborted", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = callModel(
      "Analyze this job",
      "groq",
      "openai/gpt-oss-120b"
    );
    const rejection = expect(resultPromise).rejects.toMatchObject({
      statusCode: 504,
      message: "Model request timed out"
    });

    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
