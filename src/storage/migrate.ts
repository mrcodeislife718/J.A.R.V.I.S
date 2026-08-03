import { config } from "../config/env.js";
import { createPostgresPool, runMigrations } from "./postgres.js";

const pool = createPostgresPool(config.DATABASE_URL);

try {
  const applied = await runMigrations(pool);
  console.log(`Applied ${applied.length} migration(s): ${applied.join(", ")}`);
} finally {
  await pool.end();
}
