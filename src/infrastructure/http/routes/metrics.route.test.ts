import Fastify, { FastifyInstance } from "fastify";
import { metricsRoute } from "./metrics.route";
import { healthRoute } from "./health.route";
import httpMetricsPlugin from "../../observability/httpMetrics.plugin";
import "../../observability/poolMetrics";

let app: FastifyInstance;

async function buildApp(): Promise<FastifyInstance> {
  const instance = Fastify();
  await instance.register(httpMetricsPlugin);
  await instance.register(healthRoute);
  await instance.register(metricsRoute);
  await instance.ready();
  return instance;
}

afterEach(async () => {
  if (app) await app.close();
});

describe("GET /metrics", () => {
  it("returns 200 with text/plain", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
  });

  it("includes db_pool_connections with state labels", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.body).toContain("# HELP db_pool_connections");
    expect(res.body).toContain('db_pool_connections{state="total"}');
  });

  it("increments counter after a real request via inject", async () => {
    app = await buildApp();

    // Este request debe disparar onResponse del plugin (hooks globales via fp)
    await app.inject({ method: "GET", url: "/health" });
    const res = await app.inject({ method: "GET", url: "/metrics" });

    expect(res.body).toMatch(
      /http_requests_total\{method="GET",route="\/health",status_code="200"\} [1-9]/,
    );
  });
});