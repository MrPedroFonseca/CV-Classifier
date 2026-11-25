import { z } from "zod";

export const resultSchema = z.object({
  title: z.string(),
  experienceYears: z.string().nullable(),
  technologies: z.array(z.string()),
  workModel: z.enum(["remote", "hybrid", "on-site"]).nullable(),
  salary: z.string().nullable(),
  compatibility: z.number().int().min(0).max(10),
  gaps: z.array(z.string()),
  preferences: z.object({
    workModel: z.enum(["compatible", "incompatible", "unknown"]),
    location: z.enum(["compatible", "incompatible", "unknown"])
  })
});

export type AnalysisResult = z.infer<typeof resultSchema>;
