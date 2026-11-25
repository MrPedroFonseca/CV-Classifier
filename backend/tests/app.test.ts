import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("reports that the server is healthy", async () => {
    const app = createApp(async () => "unused");

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("POST /analyze", () => {
  it("rejects a missing advertisement", async () => {
    const app = createApp(async () => "unused");

    const response = await request(app).post("/analyze").send({});

    expect(response.status).toBe(400);
  });

  it("rejects an advertisement longer than 15,000 characters", async () => {
    const app = createApp(async () => "unused");

    const response = await request(app)
      .post("/analyze")
      .send({ advertisement: "x".repeat(15_001) });

    expect(response.status).toBe(400);
  });

  it("returns the model response for valid input", async () => {
    const callModel = vi.fn(async () => "Model result");
    const app = createApp(callModel);

    const response = await request(app)
      .post("/analyze")
      .send({ advertisement: "Build APIs with TypeScript" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ result: "Model result" });
    expect(callModel).toHaveBeenCalledOnce();
  });
});
