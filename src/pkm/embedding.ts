export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
}

export class OllamaEmbeddingClient implements EmbeddingClient {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs = 60_000,
  ) {}

  async embed(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(new URL("/api/embed", this.baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: this.model, input: text }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Ollama embedding request failed with ${response.status}`);
      }
      const body = (await response.json()) as { embeddings?: number[][] };
      const vector = body.embeddings?.[0];
      if (!vector || vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
        throw new Error("Ollama returned an invalid embedding");
      }
      return vector;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class DeterministicEmbeddingClient implements EmbeddingClient {
  constructor(private readonly dimensions = 96) {}

  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = text.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean);
    for (const token of tokens) {
      let hash = 2166136261;
      for (const character of token) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      const index = Math.abs(hash) % this.dimensions;
      const direction = (hash & 1) === 0 ? 1 : -1;
      vector[index] = (vector[index] ?? 0) + direction;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
  }
}
