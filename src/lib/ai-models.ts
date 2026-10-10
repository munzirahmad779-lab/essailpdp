export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const GROQ_MODELS = [GROQ_DEFAULT_MODEL, "llama-3.1-8b-instant"];

export function normalizeGroqModel(model: unknown): string {
  return typeof model === "string" && GROQ_MODELS.includes(model)
    ? model
    : GROQ_DEFAULT_MODEL;
}