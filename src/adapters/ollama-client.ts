import { z } from "zod";
import type { ModelClient, ModelRequest, ModelResponse } from "../core/types.js";

const ollamaResponseSchema = z.object({
  response: z.string(),
  model: z.string(),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
  total_duration: z.number().nonnegative().optional(),
});

export class OllamaClient implements ModelClient {
  constructor(private readonly baseUrl: string) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          system: request.system,
          prompt: request.prompt,
          stream: false,
          options: {
            temperature: request.temperature,
            num_predict: request.maxTokens,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Ollama returned ${response.status}: ${detail.slice(0, 500)}`);
      }

      const parsed = ollamaResponseSchema.parse(await response.json());
      const result: ModelResponse = {
        text: parsed.response.trim(),
        model: parsed.model,
      };

      if (parsed.prompt_eval_count !== undefined) result.inputTokens = parsed.prompt_eval_count;
      if (parsed.eval_count !== undefined) result.outputTokens = parsed.eval_count;
      if (parsed.total_duration !== undefined) result.totalDurationMs = Math.round(parsed.total_duration / 1_000_000);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Ollama request exceeded ${request.timeoutMs} ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
