import { describe, expect, it } from "vitest";
import { removeResumeContactDetails } from "../src/services/privacy.js";

describe("removeResumeContactDetails", () => {
  // Removes the contact details the app promises to clean before model use.
  it("replaces email, phone, and postal address while preserving resume text", () => {
    const resume =
      "Name: Sam Example\nEmail: sam@example.com\nPhone: +1 (555) 123-4567\nAddress: 123 Main Street\nExperience: TypeScript engineer";

    expect(removeResumeContactDetails(resume)).toBe(
      "Name: Sam Example\nEmail: [email removed]\nPhone: [phone removed]\nAddress: [address removed]\nExperience: TypeScript engineer"
    );
  });

  // Leaves resume content unchanged when it contains no detectable contact data.
  it("preserves text without contact details", () => {
    const resume = "TypeScript engineer with five years of experience.";

    expect(removeResumeContactDetails(resume)).toBe(resume);
  });
});
