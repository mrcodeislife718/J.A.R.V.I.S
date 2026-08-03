import { buildApp } from "./app.js";
import { config } from "./config/env.js";

const app = buildApp();

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down J.A.R.V.I.S");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
