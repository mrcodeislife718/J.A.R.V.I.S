import { existsSync } from "node:fs";
import { z } from "zod";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  OLLAMA_BASE_URL: z.url().default("http://127.0.0.1:11434"),
  OLLAMA_DEFAULT_MODEL: z.string().min(1).default("qwen2.5:3b"),
  OLLAMA_STRONG_MODEL: z.string().min(1).default("qwen2.5-coder:3b"),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  DEFAULT_TOKEN_BUDGET: z.coerce.number().int().min(512).default(12_000),
  DEFAULT_MEMORY_BUDGET_MB: z.coerce.number().int().min(256).default(4_096),
  MAX_PARALLEL_GENERATIONS: z.coerce.number().int().min(1).default(1),
  HUMAN_APPROVAL_MODE: z
    .enum(["required-for-high-risk", "required-for-all-side-effects"])
    .default("required-for-high-risk"),
});

export type RuntimeConfig = z.infer<typeof envSchema>;

export const config: RuntimeConfig = envSchema.parse(process.env);
