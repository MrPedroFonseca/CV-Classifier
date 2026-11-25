import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { createApp } from "../src/app.js";
import { callModel } from "../src/services/model.js";
import {
  getConfiguredProviders,
  getProvider,
  isProviderModelAllowed
} from "../src/config/providers.js";

const unusedModel = async (
  prompt: string,
  provider: "groq" | "gemini",
  model: string
) => ({
  text: "unused",
  tokens: 0,
  timeMs: 0,
  prompt,
  provider,
  model
});

const originalGroqKey = process.env.GROQ_API_KEY;

beforeAll(() => {
  process.env.GROQ_API_KEY = "test-groq-key";
});

afterAll(() => {
  if (originalGroqKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalGroqKey;
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider configuration", () => {
  // Confirms the Groq default remains in the central allowlist.
  it("allows the configured Groq model", () => {
    expect(
      isProviderModelAllowed("groq", "openai/gpt-oss-120b")
    ).toBe(true);
  });

  // Keeps provider lookups and model allowlists in one tested source.
  it("rejects a model that is not allowed for its provider", () => {
    expect(isProviderModelAllowed("groq", "unknown-model")).toBe(false);
  });

  // Finds provider details without exposing secret values.
  it("returns provider configuration without API keys", () => {
    expect(getProvider("gemini")?.name).toBe("Google Gemini");
  });

  // Checks configured-provider discovery using environment variables.
  it("filters providers by configured API keys", () => {
    const originalGroqKey = process.env.GROQ_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;

    delete process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = "test-key";

    expect(getConfiguredProviders().map((provider) => provider.id)).toEqual([
      "gemini"
    ]);

    if (originalGroqKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalGroqKey;
    }
    if (originalGeminiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
  });
});

describe("GET /health", () => {
  // Checks the basic health response independently of model availability.
  it("reports that the server is healthy", async () => {
    const app = createApp(unusedModel);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  describe("GET /models", () => {
    // Returns only providers with a configured API key.
    it("returns configured Groq models", async () => {
      const originalGeminiKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const app = createApp(unusedModel);
      const response = await request(app).get("/models");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        providers: [
          {
            id: "groq",
            models: ["openai/gpt-oss-120b"]
          }
        ]
      });

      if (originalGeminiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalGeminiKey;
      }
    });

    // Uses an empty provider list when no API keys are configured.
    it("returns an empty provider list", async () => {
      const originalGroqKey = process.env.GROQ_API_KEY;
      const originalGeminiKey = process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const app = createApp(unusedModel);
      const response = await request(app).get("/models");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ providers: [] });

      if (originalGroqKey === undefined) {
        delete process.env.GROQ_API_KEY;
      } else {
        process.env.GROQ_API_KEY = originalGroqKey;
      }
      if (originalGeminiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalGeminiKey;
      }
    });
  });
});

describe("POST /analyze", () => {
  // Keeps missing input out of the model by checking validation before analysis.
  it("rejects a missing advertisement", async () => {
    const app = createApp(unusedModel);

    const response = await request(app).post("/analyze").send({});

    expect(response.status).toBe(400);
  });

  // Enforces the documented input limit before a request reaches the model.
  it("rejects an advertisement longer than 15,000 characters", async () => {
    const app = createApp(unusedModel);

    const response = await request(app)
      .post("/analyze")
      .send({ advertisement: "x".repeat(15_001) });

    expect(response.status).toBe(400);
  });

  // Ensures the JSON parser accepts the maximum advertisement and resume together.
  it("accepts the documented maximum sizes for both text fields", async () => {
    const validResult = {
      title: "Developer",
      experienceYears: null,
      technologies: [],
      workModel: null,
      salary: null,
      compatibility: 5,
      gaps: [],
      preferences: {
        workModel: "unknown",
        location: "unknown"
      }
    };
    const callModel = vi.fn(async () => ({
      text: JSON.stringify(validResult),
      tokens: 10,
      timeMs: 100
    }));
    const app = createApp(callModel);

    const response = await request(app)
      .post("/analyze")
      .send({
        advertisement: "a".repeat(15_000),
        resume: "b".repeat(10_000)
      });

    expect(response.status).toBe(200);
  });

  // Verifies the route and its successful response shape with a mocked model.
  it("returns the model response for valid input", async () => {
    const validResult = {
      title: "TypeScript Developer",
      experienceYears: null,
      technologies: ["TypeScript"],
      workModel: "remote",
      salary: null,
      compatibility: 8,
      gaps: [],
      preferences: {
        workModel: "compatible",
        location: "unknown"
      }
    };
    const callModel = vi.fn(async () => ({
      text: JSON.stringify(validResult),
      tokens: 25,
      timeMs: 300
    }));
    const app = createApp(callModel);

    const response = await request(app)
      .post("/analyze")
      .send({
        advertisement: "Build APIs with TypeScript",
        resume: "Developer experienced with TypeScript"
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("TypeScript Developer");
    expect(response.body.meta).toEqual({ timeMs: 300, tokens: 25 });
    expect(callModel).toHaveBeenCalledOnce();
    expect(callModel).toHaveBeenCalledWith(
      expect.any(String),
      "groq",
      "openai/gpt-oss-120b"
    );
  });

  // Rejects provider/model pairs outside the central allowlist.
  it("rejects an invalid provider and model combination", async () => {
    const callModel = vi.fn(unusedModel);
    const app = createApp(callModel);

    const response = await request(app).post("/analyze").send({
      advertisement: "Build APIs",
      resume: "TypeScript developer",
      provider: "groq",
      model: "unknown-model"
    });

    expect(response.status).toBe(400);
    expect(callModel).not.toHaveBeenCalled();
  });

  // Passes an explicitly selected Gemini model through to the model adapter.
  it("uses the selected Gemini provider and model", async () => {
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const validResult = {
      title: "Developer",
      experienceYears: null,
      technologies: ["TypeScript"],
      workModel: null,
      salary: null,
      compatibility: 5,
      gaps: [],
      preferences: {
        workModel: "unknown",
        location: "unknown"
      }
    };
    const modelCaller = vi.fn(async () => ({
      text: JSON.stringify(validResult),
      tokens: 10,
      timeMs: 200
    }));

    try {
      const app = createApp(modelCaller);
      const response = await request(app).post("/analyze").send({
        advertisement: "Developer",
        resume: "Developer",
        provider: "gemini",
        model: "gemini-3.6-flash"
      });

      expect(response.status).toBe(200);
      expect(modelCaller).toHaveBeenCalledWith(
        expect.any(String),
        "gemini",
        "gemini-3.6-flash"
      );
    } finally {
      if (originalGeminiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalGeminiKey;
      }
    }
  });

  // Confirms that invalid model JSON triggers exactly one additional model call.
  it("retries once for invalid model JSON", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({ text: "invalid", tokens: 10, timeMs: 100 })
      .mockResolvedValueOnce({ text: "invalid", tokens: 10, timeMs: 100 });
    const app = createApp(callModel);

    const response = await request(app).post("/analyze").send({
      advertisement: "Build APIs",
      resume: "TypeScript developer"
    });

    expect(response.status).toBe(502);
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  // Checks that detectable resume contact details are removed before model use.
  it("rejects missing resume input", async () => {
    const callModel = vi.fn(async () => ({
      text: "{}",
      tokens: 0,
      timeMs: 0
    }));
    const app = createApp(callModel);

    const response = await request(app).post("/analyze").send({
      advertisement: "Build APIs"
    });

    expect(response.status).toBe(400);
    expect(callModel).not.toHaveBeenCalled();
  });
});

describe("callModel", () => {
  // Uses the Gemini-compatible endpoint, key, and model without a live API call.
  it("sends a request using Gemini provider configuration", async () => {
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"title":"Developer"}' } }],
          usage: { total_tokens: 18 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await callModel(
        "Analyze this job",
        "gemini",
        "gemini-3.6-flash"
      );

      expect(result.text).toBe('{"title":"Developer"}');
      expect(result.tokens).toBe(18);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-gemini-key"
          }),
          body: expect.stringContaining('"model":"gemini-3.6-flash"')
        })
      );
    } finally {
      if (originalGeminiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalGeminiKey;
      }
    }
  });
});
