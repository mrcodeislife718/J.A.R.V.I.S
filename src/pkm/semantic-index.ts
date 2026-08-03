export interface SemanticSearchResult {
  itemId: string;
  score: number;
}

export interface SemanticIndex {
  upsert(input: { itemId: string; workspaceId: string; vector: number[] }): Promise<void>;
  search(input: { workspaceId: string; vector: number[]; limit: number }): Promise<SemanticSearchResult[]>;
  remove(itemId: string): Promise<void>;
}

export class NoopSemanticIndex implements SemanticIndex {
  async upsert(): Promise<void> {}
  async search(): Promise<SemanticSearchResult[]> {
    return [];
  }
  async remove(): Promise<void> {}
}

export class QdrantSemanticIndex implements SemanticIndex {
  private collectionReady: Promise<void> | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly collectionName: string,
    private readonly timeoutMs = 30_000,
  ) {}

  async upsert(input: { itemId: string; workspaceId: string; vector: number[] }): Promise<void> {
    await this.ensureCollection(input.vector.length);
    await this.request(`/collections/${encodeURIComponent(this.collectionName)}/points?wait=true`, {
      method: "PUT",
      body: JSON.stringify({
        points: [
          {
            id: input.itemId,
            vector: input.vector,
            payload: { itemId: input.itemId, workspaceId: input.workspaceId },
          },
        ],
      }),
    });
  }

  async search(input: {
    workspaceId: string;
    vector: number[];
    limit: number;
  }): Promise<SemanticSearchResult[]> {
    try {
      await this.ensureCollection(input.vector.length);
      const response = await this.request(
        `/collections/${encodeURIComponent(this.collectionName)}/points/search`,
        {
          method: "POST",
          body: JSON.stringify({
            vector: input.vector,
            limit: input.limit,
            with_payload: true,
            filter: {
              must: [{ key: "workspaceId", match: { value: input.workspaceId } }],
            },
          }),
        },
      );
      const body = (await response.json()) as {
        result?: Array<{ id: string | number; score: number; payload?: { itemId?: string } }>;
      };
      return (body.result ?? [])
        .map((point) => ({ itemId: point.payload?.itemId ?? String(point.id), score: point.score }))
        .filter((point) => Number.isFinite(point.score));
    } catch {
      return [];
    }
  }

  async remove(itemId: string): Promise<void> {
    await this.request(`/collections/${encodeURIComponent(this.collectionName)}/points/delete?wait=true`, {
      method: "POST",
      body: JSON.stringify({ points: [itemId] }),
    });
  }

  private async ensureCollection(dimensions: number): Promise<void> {
    this.collectionReady ??= this.createCollection(dimensions);
    await this.collectionReady;
  }

  private async createCollection(dimensions: number): Promise<void> {
    const check = await this.request(`/collections/${encodeURIComponent(this.collectionName)}`, {
      method: "GET",
      allowNotFound: true,
    });
    if (check.status !== 404) return;

    const create = await this.request(`/collections/${encodeURIComponent(this.collectionName)}`, {
      method: "PUT",
      body: JSON.stringify({
        vectors: { size: dimensions, distance: "Cosine", on_disk: true },
        on_disk_payload: true,
      }),
      allowConflict: true,
    });
    if (!create.ok && create.status !== 409) {
      throw new Error(`Qdrant collection creation failed with ${create.status}`);
    }
  }

  private async request(
    path: string,
    options: {
      method: "GET" | "POST" | "PUT";
      body?: string;
      allowNotFound?: boolean;
      allowConflict?: boolean;
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const init: RequestInit = {
        method: options.method,
        headers: { "content-type": "application/json" },
        signal: controller.signal,
      };
      if (options.body !== undefined) init.body = options.body;
      const response = await fetch(new URL(path, this.baseUrl), init);
      if (response.ok) return response;
      if (options.allowNotFound && response.status === 404) return response;
      if (options.allowConflict && response.status === 409) return response;
      throw new Error(`Qdrant request failed with ${response.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
