import { createOpenAI } from "@ai-sdk/openai";

export type LLMModel = {
  id: string;
  name: string;
  provider: string;
  providerId: string;
};

export type LLMModelConfig = {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
};

export function getModelClient(model: LLMModel, config: LLMModelConfig) {
  const { id: modelNameString } = model;
  const { apiKey, baseURL } = config;

  return createOpenAI({
    apiKey: apiKey || process.env.GEMINI_API_KEY,
    baseURL: baseURL || "https://generativelanguage.googleapis.com/v1beta/openai/",
  })(modelNameString);
}
