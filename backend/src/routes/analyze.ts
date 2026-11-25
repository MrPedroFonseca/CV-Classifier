import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { ModelRequestError } from "../errors/model-request-error.js";

const analyzeRequestSchema = z.object({
  advertisement: z
    .string()
    .trim()
    .min(1, "Advertisement is required")
    .max(15_000, "Advertisement must be at most 15,000 characters")
});

export type ModelCaller = (prompt: string) => Promise<string>;

export function createAnalyzeRouter(modelCaller: ModelCaller): Router {
  const router = Router();

  const analyze: RequestHandler = async (request, response) => {
    const parsed = analyzeRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "Invalid request",
        details: parsed.error.issues.map((issue) => issue.message)
      });
      return;
    }

    try {
      const prompt = `Analyze the following job advertisement and return a concise response:\n\n${parsed.data.advertisement}`;
      const result = await modelCaller(prompt);
      response.status(200).json({ result });
    } catch (error) {
      if (error instanceof ModelRequestError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
      }

      response.status(502).json({ error: "The model request failed" });
    }
  };

  router.post("/", analyze);
  return router;
}
