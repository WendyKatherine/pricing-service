import Fastify, { FastifyInstance } from "fastify";
import { env } from "../config/env";
import { healthRoute } from "./routes/health.route";
import httpMetricsPlugin from "../observability/httpMetrics.plugin";

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  app.register(healthRoute);
  app.register(httpMetricsPlugin);

  return app;
}
