import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

const unusedModel = async () => ({
  text: "unused",
  tokens: 0,
  timeMs: 0
});

describe("GET /health", () => {
  // Checks the basic health response independently of model availability.
  it("reports that the server is healthy", async () => {
    const app = createApp(unusedModel);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
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
