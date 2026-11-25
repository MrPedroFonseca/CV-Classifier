import express, { type Express } from "express";
import { createAnalyzeRouter, type ModelCaller } from "./routes/analyze.js";
import { createResumeRouter } from "./routes/resume.js";
import { createModelsRouter } from "./routes/models.js";

// Creates the HTTP application and wires routes without starting the server.
export function createApp(modelCaller: ModelCaller): Express {
  const app = express();

  app.use(express.json({ limit: "128kb" }));

  // Checks whether the process is running and ready to receive requests.
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/analyze", createAnalyzeRouter(modelCaller));
  app.use("/resume", createResumeRouter());
  app.use("/models", createModelsRouter());

  return app;
}
