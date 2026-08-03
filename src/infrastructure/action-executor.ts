import { actionRequiresPrivilegedExecutor } from "./policy.js";
import type {
  InfrastructureActionExecutionResult,
  InfrastructureActionRequest,
  InfrastructureNode,
  InfrastructureServiceRecord,
} from "./types.js";

export interface InfrastructureActionExecutionContext {
  node: InfrastructureNode;
  services: InfrastructureServiceRecord[];
}

export interface InfrastructureActionExecutor {
  execute(
    action: InfrastructureActionRequest,
    context: InfrastructureActionExecutionContext,
  ): Promise<InfrastructureActionExecutionResult>;
}

export class GovernedRecordOnlyActionExecutor implements InfrastructureActionExecutor {
  async execute(
    action: InfrastructureActionRequest,
    context: InfrastructureActionExecutionContext,
  ): Promise<InfrastructureActionExecutionResult> {
    if (action.dryRun) {
      return {
        executed: false,
        success: true,
        message: `Dry run validated ${action.kind} for ${action.target}`,
        detail: {
          nodeId: context.node.id,
          privilegedExecutorRequired: actionRequiresPrivilegedExecutor(action.kind),
        },
      };
    }

    switch (action.kind) {
      case "health-check": {
        const service = context.services.find(
          (candidate) => candidate.id === action.target || candidate.name === action.target,
        );
        return {
          executed: true,
          success: service ? service.status === "healthy" : context.node.status === "online",
          message: service
            ? `Recorded service health for ${service.name}: ${service.status}`
            : `Recorded node health for ${context.node.name}: ${context.node.status}`,
          detail: service
            ? { serviceId: service.id, status: service.status }
            : { nodeId: context.node.id, status: context.node.status },
        };
      }
      case "verify-backup":
        return {
          executed: false,
          success: false,
          message: "A backup verifier adapter must prove archive integrity or perform a restore test",
          detail: { target: action.target, adapter: "not-configured" },
        };
      case "drain-node":
      case "resume-node":
        return {
          executed: true,
          success: true,
          message: `${action.kind} updated scheduling state only; no operating-system command was run`,
          detail: { controlPlaneOnly: true, nodeId: context.node.id },
        };
      case "restart-service":
      case "rotate-logs":
        return {
          executed: false,
          success: false,
          message: "No privileged node executor is configured; the requested operating-system action was not run",
          detail: { target: action.target, adapter: "not-configured" },
        };
    }
  }
}
