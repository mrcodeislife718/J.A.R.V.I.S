import assert from "node:assert/strict";
import test from "node:test";
import { GovernedRecordOnlyActionExecutor } from "../../src/infrastructure/action-executor.js";
import { PostgresInfrastructureRepository } from "../../src/infrastructure/postgres-repository.js";
import { InfrastructureService } from "../../src/infrastructure/service.js";
import { createPostgresPool, runMigrations } from "../../src/storage/postgres.js";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test("PostgreSQL infrastructure persistence requires TEST_DATABASE_URL", { skip: true }, () => undefined);
} else {
  test("infrastructure state survives a PostgreSQL repository restart", async () => {
    const firstPool = createPostgresPool(connectionString);
    await runMigrations(firstPool);
    await firstPool.query(`TRUNCATE
      infra_events,
      infra_backup_verifications,
      infra_backups,
      infra_actions,
      infra_incidents,
      infra_alerts,
      infra_services,
      infra_metrics,
      infra_nodes
      RESTART IDENTITY CASCADE`);

    const firstService = new InfrastructureService(
      new PostgresInfrastructureRepository(firstPool),
      new GovernedRecordOnlyActionExecutor(),
    );
    await firstService.registerNode({
      id: "persistent-node",
      name: "Persistent Node",
      hostname: "persistent-node.local",
      platform: "linux",
      architecture: "x64",
      role: "worker",
      labels: ["persistent"],
      capabilities: ["ollama", "storage"],
      agentVersion: "0.3.0-test",
      capacity: {
        cpuCores: 8,
        memoryTotalBytes: 64_000,
        swapTotalBytes: 8_000,
        diskTotalBytes: 500_000,
        gpuMemoryTotalBytes: null,
      },
    });
    await firstService.heartbeat("persistent-node", {
      metric: {
        cpuUtilization: 0.2,
        load1: 1.6,
        memoryUsedBytes: 12_000,
        swapUsedBytes: 0,
        diskUsedBytes: 100_000,
        temperatureC: null,
        networkRxBytes: null,
        networkTxBytes: null,
        processCount: 150,
        metadata: {},
      },
      services: [{
        id: "persistent-node-ollama",
        name: "ollama",
        kind: "model-runtime",
        endpoint: "http://127.0.0.1:11434",
        status: "healthy",
        metadata: {},
      }],
    });
    const incident = await firstService.createIncident({
      title: "Persistence proof",
      severity: "info",
      nodeIds: ["persistent-node"],
      summary: "Verify infrastructure records survive service restart.",
    });
    const backup = await firstService.upsertBackup({
      id: "persistent-backup",
      nodeId: "persistent-node",
      name: "Persistent backup",
      source: "/var/lib/jarvis",
      repository: "/backups/jarvis",
      status: "unknown",
    });
    await firstService.recordBackupVerification(backup.id, {
      success: true,
      method: "checksum-and-restore-test",
      detail: "Verified in isolated test directory.",
      performedBy: "postgres-test",
    });
    const action = await firstService.requestAction({
      nodeId: "persistent-node",
      incidentId: incident.id,
      kind: "health-check",
      target: "persistent-node-ollama",
      requestedBy: "postgres-test",
      idempotencyKey: "persistent-health-check-001",
    });
    await firstService.approveAction(action.id, "Charles Castillo", "Read-only health check only.");
    await firstService.executeAction(action.id);
    await firstPool.end();

    const secondPool = createPostgresPool(connectionString);
    const secondService = new InfrastructureService(
      new PostgresInfrastructureRepository(secondPool),
      new GovernedRecordOnlyActionExecutor(),
    );
    const fleet = await secondService.fleetSnapshot();
    assert.equal(fleet.totals.registeredNodes, 1);
    assert.equal(fleet.nodes[0]?.node.id, "persistent-node");
    assert.equal(fleet.nodes[0]?.latestMetric?.memoryUsedBytes, 12_000);
    assert.equal(fleet.nodes[0]?.services[0]?.name, "ollama");

    const incidents = await secondService.listIncidents();
    assert.equal(incidents[0]?.id, incident.id);
    const backups = await secondService.listBackups();
    assert.equal(backups[0]?.status, "healthy");
    const actions = await secondService.listActions();
    assert.equal(actions[0]?.status, "succeeded");
    const events = await secondService.listEvents({ nodeId: "persistent-node" });
    assert.ok(events.length >= 6);
    await secondPool.end();
  });
}
