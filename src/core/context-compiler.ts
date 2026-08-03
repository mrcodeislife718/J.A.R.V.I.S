import { getDomainManifest } from "../domains/registry.js";
import type { MemoryRepository } from "../storage/in-memory.js";
import type { ContextPacket, MissionRecord } from "./types.js";

export class ContextCompiler {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async compile(mission: MissionRecord): Promise<ContextPacket> {
    const manifest = getDomainManifest(mission.request.domain);
    const approvedMemories = (await this.memoryRepository.list("approved"))
      .filter((memory) => memory.domain === mission.request.domain && memory.namespace === manifest.memoryNamespace)
      .slice(0, 8);

    const workingState: string[] = [];
    if (Object.keys(mission.request.inputs).length > 0) {
      workingState.push(`Mission inputs: ${JSON.stringify(mission.request.inputs).slice(0, 8_000)}`);
    }
    for (const memory of approvedMemories) {
      workingState.push(`Approved memory ${memory.id}: ${memory.content.slice(0, 2_000)}`);
    }

    return {
      missionId: mission.id,
      domain: mission.request.domain,
      objective: mission.request.objective,
      constraints: mission.constraints,
      workingState,
      evidence: approvedMemories.flatMap((memory) => memory.provenance),
      uncertainties: [
        {
          label: "unverified",
          statement: "Claims created during this mission remain unverified until the verification plane passes them.",
        },
      ],
    };
  }
}
