import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { ModelRequestError } from "../errors/model-request-error.js";
import { resultSchema, type AnalysisResult } from "../schemas/result.js";
import { buildPrompt } from "../services/prompt.js";
import { removeResumeContactDetails } from "../services/privacy.js";
import type { WorkPreferences } from "../types/preferences.js";
import {
  getProvider,
  isProviderModelAllowed,
  type ProviderId
} from "../config/providers.js";

const analyzeRequestSchema = z.object({
  advertisement: z
    .string()
    .trim()
    .min(1, "Advertisement is required")
    .max(15_000, "Advertisement must be at most 15,000 characters"),
  resume: z
    .string()
    .trim()
    .min(1, "Resume is required")
    .max(10_000, "Resume must be at most 10,000 characters"),
  preferences: z.object({
    models: z.array(z.enum(["remote", "hybrid", "on-site"])).optional().default([]),
    locations: z.array(z.object({
      city: z.string().trim().min(1),
      maxDays: z.number().int().min(0).max(7)
    })).optional().default([])
  }).optional().default({
    models: [],
    locations: []
  }),
  provider: z.enum(["groq", "gemini"]).optional().default("groq"),
  model: z.string().trim().min(1).optional()
});

export interface ModelResponse {
  text: string;
  tokens: number;
  timeMs: number;
}

export type ModelCaller = (
  prompt: string,
  provider: ProviderId,
  model: string
) => Promise<ModelResponse>;

// Parses model JSON after an optional second attempt and returns the API result.
export function parseModelResult(text: string): AnalysisResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return resultSchema.parse(JSON.parse(cleaned));
}

// Builds the analyze route with strict request, model, and response validation.
export function createAnalyzeRouter(modelCaller: ModelCaller): Router {
  const router = Router();

  // Validates the request, calls the model, and converts failures into HTTP responses.
  const analyze: RequestHandler = async (request, response) => {
    const parsed = analyzeRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "Invalid request",
        details: parsed.error.issues.map((issue) => issue.message)
      });
      return;
    }

    const provider = parsed.data.provider;
    const providerConfig = getProvider(provider);
    const model = parsed.data.model ?? providerConfig?.models[0];

    if (!model) {
      response.status(400).json({
        error: "The selected provider has no allowed model"
      });
      return;
    }

    if (!isProviderModelAllowed(provider, model)) {
      response.status(400).json({
        error: "The selected provider and model combination is not allowed"
      });
      return;
    }

    if (!providerConfig || !process.env[providerConfig.apiKeyEnvironmentName]) {
      response.status(400).json({
        error: `The ${providerConfig?.name ?? provider} API key is not configured`
      });
      return;
    }

    try {
      const resume = removeResumeContactDetails(parsed.data.resume);
      const preferences: WorkPreferences = {
        models: parsed.data.preferences.models,
        locations: parsed.data.preferences.locations
      };
      const prompt = buildPrompt(
        parsed.data.advertisement,
        resume,
        preferences
      );

      let modelResponse = await modelCaller(prompt, provider, model);
      let result: AnalysisResult;
      try {
        result = parseModelResult(modelResponse.text);
      } catch {
        // Invalid model JSON gets exactly one retry.
        modelResponse = await modelCaller(prompt, provider, model);
        result = parseModelResult(modelResponse.text);
      }

      response.status(200).json({
        ...result,
        meta: {
          timeMs: modelResponse.timeMs,
          tokens: modelResponse.tokens
        }
      });
    } catch (error) {
      if (error instanceof ModelRequestError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
      }

      if (error instanceof SyntaxError || error instanceof z.ZodError) {
        response.status(502).json({
          error: "The model returned invalid JSON after the retry"
        });
        return;
      }

      response.status(502).json({ error: "The model request failed" });
    }
  };

  router.post("/", analyze);
  return router;
}
