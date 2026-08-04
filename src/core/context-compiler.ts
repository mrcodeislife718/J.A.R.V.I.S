import type { AnalyticsMissionContext } from "../analytics/types.js";
import type { BiomedicalMissionContext } from "../biomedical/types.js";
import type { BusinessMissionContext } from "../business/types.js";
import type { ContentMissionContext } from "../content/types.js";
import { getDomainManifest } from "../domains/registry.js";
import type { InfrastructureMissionContext } from "../infrastructure/types.js";
import type { PkmResumePacket } from "../pkm/types.js";
import type { SupportMissionContext } from "../support/types.js";
import type { MemoryRepository } from "../storage/in-memory.js";
import type { ContextPacket, EvidenceReference, MissionRecord } from "./types.js";

export interface PersistentContextProvider {
  buildResumePacket(workspaceId: string): Promise<PkmResumePacket>;
}

export interface InfrastructureContextProvider {
  buildMissionContext(nodeId?: string): Promise<InfrastructureMissionContext>;
}

export interface AnalyticsContextProvider {
  buildMissionContext(sourceId?: string, metricId?: string): Promise<AnalyticsMissionContext>;
}

export interface BiomedicalContextProvider {
  buildMissionContext(workspaceId?: string, programId?: string): Promise<BiomedicalMissionContext>;
}

export interface BusinessContextProvider {
  buildMissionContext(organizationId?: string): Promise<BusinessMissionContext>;
}

export interface ContentContextProvider {
  buildMissionContext(brandId?: string, draftId?: string): Promise<ContentMissionContext>;
}

export interface SupportContextProvider {
  buildMissionContext(workspaceId?: string, ticketId?: string): Promise<SupportMissionContext>;
}

const compactItems = (
  label: string,
  items: PkmResumePacket["decisions"],
  maximum = 12,
): string | null => {
  if (items.length === 0) return null;
  const lines = items.slice(0, maximum).map((item) => {
    const locator = `${item.sourceId}:${item.sourceStart ?? "?"}-${item.sourceEnd ?? "?"}`;
    return `- [${item.id}] ${item.title} | ${item.body.slice(0, 700)} | source ${locator}`;
  });
  return `${label}:\n${lines.join("\n")}`;
};

const formatResumePacket = (packet: PkmResumePacket): string => {
  const sections = [
    `Persistent workspace: ${packet.workspace.name} (${packet.workspace.id})`,
    compactItems("Decisions", packet.decisions),
    compactItems("Standing rules", packet.standingRules),
    compactItems("Corrections", packet.corrections),
    compactItems("Unresolved questions", packet.unresolvedQuestions),
    compactItems("Next actions", packet.nextActions),
    compactItems("Project state", packet.projectState),
    compactItems("Contradictions", packet.contradictions),
  ].filter((section): section is string => section !== null);
  return sections.join("\n\n").slice(0, 18_000);
};

const resumeEvidence = (packet: PkmResumePacket): EvidenceReference[] => {
  const items = [
    ...packet.decisions,
    ...packet.standingRules,
    ...packet.corrections,
    ...packet.unresolvedQuestions,
    ...packet.nextActions,
    ...packet.projectState,
    ...packet.contradictions,
  ];
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const key = `${item.sourceId}:${item.sourceStart ?? "?"}:${item.sourceEnd ?? "?"}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        id: item.id,
        source: `pkm:${packet.workspace.id}:${item.sourceId}`,
        locator: `${item.sourceStart ?? "?"}-${item.sourceEnd ?? "?"}`,
        retrievedAt: packet.generatedAt,
        trust: "internal" as const,
      },
    ];
  });
};

const appendGovernedContext = (
  workingState: string[],
  evidence: EvidenceReference[],
  uncertainties: ContextPacket["uncertainties"],
  label: string,
  context: {
    summary: string;
    evidence: Array<{ id: string; source: string; locator: string; retrievedAt: string }>;
    uncertainties: string[];
  },
): void => {
  workingState.push(`${label}:\n${context.summary}`);
  evidence.push(...context.evidence.map((reference) => ({ ...reference, trust: "internal" as const })));
  uncertainties.push(...context.uncertainties.map((statement) => ({ label: "missing" as const, statement })));
};

export class ContextCompiler {
  private persistentContextProvider: PersistentContextProvider | null = null;
  private infrastructureContextProvider: InfrastructureContextProvider | null = null;
  private analyticsContextProvider: AnalyticsContextProvider | null = null;
  private biomedicalContextProvider: BiomedicalContextProvider | null = null;
  private businessContextProvider: BusinessContextProvider | null = null;
  private contentContextProvider: ContentContextProvider | null = null;
  private supportContextProvider: SupportContextProvider | null = null;

  constructor(private readonly memoryRepository: MemoryRepository) {}

  setPersistentContextProvider(provider: PersistentContextProvider): void {
    this.persistentContextProvider = provider;
  }

  setInfrastructureContextProvider(provider: InfrastructureContextProvider): void {
    this.infrastructureContextProvider = provider;
  }

  setAnalyticsContextProvider(provider: AnalyticsContextProvider): void {
    this.analyticsContextProvider = provider;
  }

  setBiomedicalContextProvider(provider: BiomedicalContextProvider): void {
    this.biomedicalContextProvider = provider;
  }

  setBusinessContextProvider(provider: BusinessContextProvider): void {
    this.businessContextProvider = provider;
  }

  setContentContextProvider(provider: ContentContextProvider): void {
    this.contentContextProvider = provider;
  }

  setSupportContextProvider(provider: SupportContextProvider): void {
    this.supportContextProvider = provider;
  }

  async compile(mission: MissionRecord): Promise<ContextPacket> {
    const manifest = getDomainManifest(mission.request.domain);
    const approvedMemories = (await this.memoryRepository.list("approved"))
      .filter((memory) => memory.domain === mission.request.domain && memory.namespace === manifest.memoryNamespace)
      .slice(0, 8);

    const workingState: string[] = [];
    const evidence: EvidenceReference[] = approvedMemories.flatMap((memory) => memory.provenance);
    const uncertainties: ContextPacket["uncertainties"] = [
      {
        label: "unverified",
        statement: "Claims created during this mission remain unverified until the verification plane passes them.",
      },
    ];

    if (Object.keys(mission.request.inputs).length > 0) {
      workingState.push(`Mission inputs: ${JSON.stringify(mission.request.inputs).slice(0, 8_000)}`);
    }
    for (const memory of approvedMemories) {
      workingState.push(`Approved memory ${memory.id}: ${memory.content.slice(0, 2_000)}`);
    }

    const workspaceId = mission.request.inputs.workspaceId;
    if (
      mission.request.domain === "personal-knowledge" &&
      typeof workspaceId === "string" &&
      this.persistentContextProvider
    ) {
      try {
        const packet = await this.persistentContextProvider.buildResumePacket(workspaceId);
        workingState.push(formatResumePacket(packet));
        evidence.push(...resumeEvidence(packet));
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Persistent workspace context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    if (mission.request.domain === "infrastructure-administration" && this.infrastructureContextProvider) {
      const requestedNodeId = mission.request.inputs.nodeId;
      try {
        appendGovernedContext(
          workingState,
          evidence,
          uncertainties,
          "Verified infrastructure control-plane state",
          await this.infrastructureContextProvider.buildMissionContext(
            typeof requestedNodeId === "string" ? requestedNodeId : undefined,
          ),
        );
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Infrastructure context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    if (mission.request.domain === "analytics" && this.analyticsContextProvider) {
      const requestedSourceId = mission.request.inputs.sourceId;
      const requestedMetricId = mission.request.inputs.metricId;
      try {
        appendGovernedContext(
          workingState,
          evidence,
          uncertainties,
          "Governed analytics registry and evidence state",
          await this.analyticsContextProvider.buildMissionContext(
            typeof requestedSourceId === "string" ? requestedSourceId : undefined,
            typeof requestedMetricId === "string" ? requestedMetricId : undefined,
          ),
        );
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Analytics context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    if (mission.request.domain === "biomedical-research" && this.biomedicalContextProvider) {
      const biomedicalWorkspaceId = mission.request.inputs.workspaceId;
      const programId = mission.request.inputs.programId;
      try {
        appendGovernedContext(
          workingState,
          evidence,
          uncertainties,
          "Governed biomedical research, development, laboratory, IP, funding, manufacturing, and commercialization state",
          await this.biomedicalContextProvider.buildMissionContext(
            typeof biomedicalWorkspaceId === "string" ? biomedicalWorkspaceId : undefined,
            typeof programId === "string" ? programId : undefined,
          ),
        );
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Biomedical context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    if (mission.request.domain === "business-operations" && this.businessContextProvider) {
      const organizationId = mission.request.inputs.organizationId;
      try {
        appendGovernedContext(
          workingState,
          evidence,
          uncertainties,
          "Governed business operating state",
          await this.businessContextProvider.buildMissionContext(
            typeof organizationId === "string" ? organizationId : undefined,
          ),
        );
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Business context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    if (mission.request.domain === "content-production" && this.contentContextProvider) {
      const brandId = mission.request.inputs.brandId;
      const draftId = mission.request.inputs.draftId;
      try {
        appendGovernedContext(
          workingState,
          evidence,
          uncertainties,
          "Governed content production state",
          await this.contentContextProvider.buildMissionContext(
            typeof brandId === "string" ? brandId : undefined,
            typeof draftId === "string" ? draftId : undefined,
          ),
        );
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Content context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    if (mission.request.domain === "customer-support" && this.supportContextProvider) {
      const supportWorkspaceId = mission.request.inputs.workspaceId;
      const ticketId = mission.request.inputs.ticketId;
      try {
        appendGovernedContext(
          workingState,
          evidence,
          uncertainties,
          "Governed customer support state",
          await this.supportContextProvider.buildMissionContext(
            typeof supportWorkspaceId === "string" ? supportWorkspaceId : undefined,
            typeof ticketId === "string" ? ticketId : undefined,
          ),
        );
      } catch (error) {
        uncertainties.push({
          label: "missing",
          statement: `Customer support context could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }

    return {
      missionId: mission.id,
      domain: mission.request.domain,
      objective: mission.request.objective,
      constraints: mission.constraints,
      workingState,
      evidence,
      uncertainties,
    };
  }
}
