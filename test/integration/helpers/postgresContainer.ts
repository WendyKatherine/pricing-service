import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";
import path from "path";

export interface StartedContainer {
  connectionString: string;
  stop: () => Promise<void>;
}

/**
 * Starts a Postgres 16-alpine container and runs the REAL migration
 * against it via `node-pg-migrate` as a subprocess.
 *
 * This guarantees we test the exact same schema creation that runs
 * in production — no hand-written SQL, no second source of truth.
 */
export async function startPostgresContainer(): Promise<StartedContainer> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgres:16-alpine",
  ).start();

  const connectionString = container.getConnectionUri();

  const projectRoot = path.resolve(__dirname, "../../..");

  execSync(
    "node node_modules/node-pg-migrate/bin/node-pg-migrate.js up",
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
      stdio: "pipe",
      timeout: 30_000,
    },
  );

  return {
    connectionString,
    stop: async () => {
      await container.stop();
    },
  };
}
