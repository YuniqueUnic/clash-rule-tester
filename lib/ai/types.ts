export type AIProvider = "openai" | "gemini" | "openai-compatible" | "";

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  endpoint?: string;
}

