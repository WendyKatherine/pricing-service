import Fastify, { FastifyInstance } from "fastify";
import { env } from "../config/env";
import { healthRoute } from "./routes/health.route";

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  app.register(healthRoute);

  return app;
}
