import { describe, expect, it } from "vitest";
import { normalizeGroqModel } from "@/lib/ai-models";

describe("Groq model compatibility", () => {
  it("replaces the decommissioned Mixtral model", () => {
    expect(normalizeGroqModel("mixtral-8x7b-32768")).toBe("llama-3.3-70b-versatile");
  });
  it("uses a Groq default when a model was not supplied", () => {
    expect(normalizeGroqModel(undefined)).toBe("llama-3.3-70b-versatile");
  });
  it("preserves the supported fast model", () => {
    expect(normalizeGroqModel("llama-3.1-8b-instant")).toBe("llama-3.1-8b-instant");
  });
});