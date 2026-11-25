import { Router, type RequestHandler } from "express";
import { getConfiguredProviders } from "../config/providers.js";

// Returns provider and model choices that are usable with configured API keys.
export function createModelsRouter(): Router {
  const router = Router();

  const listModels: RequestHandler = (_request, response) => {
    const providers = getConfiguredProviders().map((provider) => ({
      id: provider.id,
      models: [...provider.models]
    }));

    response.status(200).json({ providers });
  };

  router.get("/", listModels);
  return router;
}
