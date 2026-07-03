import { FastifyInstance } from "fastify";
import type { Pool } from "pg";

export async function readyRoute(
  app: FastifyInstance,
  opts: { readonly pool: Pool },
): Promise<void> {
  app.get("/ready", async (_request, _reply) => {
    try {
      await opts.pool.query("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch {
      return { status: "ok", db: "error" };
    }
  });
}
