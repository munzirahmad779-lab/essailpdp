export const GROQ_DEFAULT_MODEL = "qwen/qwen3.8-27b";
export const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
];

export function normalizeGroqModel(model: unknown): string {
  if (typeof model === "string" && model.trim()) {
    return model.trim();
  }
  return GROQ_DEFAULT_MODEL;
}