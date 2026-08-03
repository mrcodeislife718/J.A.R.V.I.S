import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg, { type Pool as PoolType } from "pg";

const { Pool } = pg;

export const createPostgresPool = (connectionString: string): PoolType =>
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

export const runMigrations = async (
  pool: PoolType,
  migrationsDirectory = resolve(process.cwd(), "migrations"),
): Promise<string[]> => {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+.*\.sql$/u.test(file))
    .sort((a, b) => a.localeCompare(b));

  const applied: string[] = [];
  for (const file of files) {
    const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
    await pool.query(sql);
    applied.push(file);
  }
  return applied;
};
