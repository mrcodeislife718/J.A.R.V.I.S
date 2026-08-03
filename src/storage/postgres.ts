import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg, { type Pool as PoolType, type PoolClient } from "pg";

const { Pool } = pg;
const MIGRATION_LOCK_ID = 718_718;

export const createPostgresPool = (connectionString: string): PoolType =>
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

const ensureMigrationTable = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS jarvis_schema_migrations (
      filename text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

export const runMigrations = async (
  pool: PoolType,
  migrationsDirectory = resolve(process.cwd(), "migrations"),
): Promise<string[]> => {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+.*\.sql$/u.test(file))
    .sort((a, b) => a.localeCompare(b));

  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await ensureMigrationTable(client);

    for (const file of files) {
      const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM jarvis_schema_migrations WHERE filename=$1",
        [file],
      );
      const recorded = existing.rows[0];
      if (recorded) {
        if (recorded.checksum !== checksum) {
          throw new Error(
            `Migration ${file} changed after it was applied. Create a new migration instead of editing history.`,
          );
        }
        continue;
      }

      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO jarvis_schema_migrations (filename, checksum) VALUES ($1, $2)",
          [file, checksum],
        );
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }

    return applied;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
};
