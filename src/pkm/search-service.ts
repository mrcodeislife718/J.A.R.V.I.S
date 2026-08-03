import type { EmbeddingClient } from "./embedding.js";
import type { PkmRepository } from "./repository.js";
import type { SemanticIndex } from "./semantic-index.js";
import type { PkmSearchHit } from "./types.js";

export class PkmSearchService {
  constructor(
    private readonly repository: PkmRepository,
    private readonly embeddingClient: EmbeddingClient,
    private readonly semanticIndex: SemanticIndex,
  ) {}

  async search(workspaceId: string, query: string, limit = 20): Promise<PkmSearchHit[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 100));
    const candidateLimit = Math.min(boundedLimit * 3, 200);
    const lexical = await this.repository.lexicalSearch(workspaceId, query, candidateLimit);

    let semantic: Array<{ itemId: string; score: number }> = [];
    try {
      const vector = await this.embeddingClient.embed(query);
      semantic = await this.semanticIndex.search({ workspaceId, vector, limit: candidateLimit });
    } catch {
      semantic = [];
    }

    const fused = new Map<
      string,
      {
        item: PkmSearchHit["item"];
        score: number;
        lexicalRank: number | null;
        semanticRank: number | null;
        matchedBy: Set<"lexical" | "semantic">;
      }
    >();
    const rrfK = 60;

    for (const hit of lexical) {
      const rank = hit.lexicalRank ?? lexical.indexOf(hit) + 1;
      fused.set(hit.item.id, {
        item: hit.item,
        score: 1 / (rrfK + rank),
        lexicalRank: rank,
        semanticRank: null,
        matchedBy: new Set(["lexical"]),
      });
    }

    for (const [index, hit] of semantic.entries()) {
      const item = await this.repository.getItem(hit.itemId);
      if (!item || item.workspaceId !== workspaceId || item.status !== "approved") continue;
      const rank = index + 1;
      const existing = fused.get(item.id);
      if (existing) {
        existing.score += 1 / (rrfK + rank);
        existing.semanticRank = rank;
        existing.matchedBy.add("semantic");
      } else {
        fused.set(item.id, {
          item,
          score: 1 / (rrfK + rank),
          lexicalRank: null,
          semanticRank: rank,
          matchedBy: new Set(["semantic"]),
        });
      }
    }

    return [...fused.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, boundedLimit)
      .map((hit) => ({
        item: hit.item,
        score: hit.score,
        lexicalRank: hit.lexicalRank,
        semanticRank: hit.semanticRank,
        matchedBy: [...hit.matchedBy],
      }));
  }
}
