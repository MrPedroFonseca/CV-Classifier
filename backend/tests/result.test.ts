import { describe, expect, it } from "vitest";
import { resultSchema } from "../src/schemas/result.js";

const validResult = {
  title: "Frontend Developer",
  experienceYears: "3+ years",
  technologies: ["React", "TypeScript"],
  workModel: "hybrid",
  salary: null,
  compatibility: 8,
  gaps: ["GraphQL"],
  preferences: {
    workModel: "compatible",
    location: "unknown"
  }
};

describe("resultSchema", () => {
  // Accepts a complete analysis matching the API response contract.
  it("accepts a valid analysis result", () => {
    expect(resultSchema.safeParse(validResult).success).toBe(true);
  });

  // Rejects scores outside the documented inclusive 0-to-10 range.
  it("rejects a compatibility score above 10", () => {
    expect(
      resultSchema.safeParse({ ...validResult, compatibility: 11 }).success
    ).toBe(false);
  });

  // Rejects work-model values that are not part of the response contract.
  it("rejects an unsupported work model", () => {
    expect(
      resultSchema.safeParse({ ...validResult, workModel: "flexible" }).success
    ).toBe(false);
  });
});
