import express, { type Express } from "express";
import { createAnalyzeRouter, type ModelCaller } from "./routes/analyze.js";

export function createApp(modelCaller: ModelCaller): Express {
  const app = express();

  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/analyze", createAnalyzeRouter(modelCaller));

  return app;
}
