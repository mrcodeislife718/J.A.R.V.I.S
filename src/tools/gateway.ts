import type { DomainId, MissionRecord } from "../core/types.js";

export interface ToolInvocationContext {
  mission: MissionRecord;
  actor: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  description: string;
  allowedDomains: DomainId[];
  sideEffecting: boolean;
  parse(input: unknown): TInput;
  execute(input: TInput, context: ToolInvocationContext): Promise<TOutput>;
}

type RegisteredTool = ToolDefinition<any, unknown>;

export class ToolGateway {
  private readonly tools = new Map<string, RegisteredTool>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.id)) throw new Error(`Tool ${tool.id} is already registered`);
    this.tools.set(tool.id, tool);
  }

  listForDomain(domain: DomainId): Array<Pick<RegisteredTool, "id" | "description" | "sideEffecting">> {
    return [...this.tools.values()]
      .filter((tool) => tool.allowedDomains.includes(domain))
      .map(({ id, description, sideEffecting }) => ({ id, description, sideEffecting }));
  }

  async invoke<TOutput>(toolId: string, input: unknown, context: ToolInvocationContext): Promise<TOutput> {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} is not registered`);
    if (!tool.allowedDomains.includes(context.mission.request.domain)) {
      throw new Error(`Tool ${toolId} is not allowed in ${context.mission.request.domain}`);
    }
    if (tool.sideEffecting) {
      if (!context.mission.constraints.allowSideEffects) {
        throw new Error(`Tool ${toolId} is side-effecting but mission side effects are disabled`);
      }
      if (!context.mission.authorization) {
        throw new Error(`Tool ${toolId} requires explicit human authorization`);
      }
    }

    const validatedInput = tool.parse(input);
    return (await tool.execute(validatedInput, context)) as TOutput;
  }
}
