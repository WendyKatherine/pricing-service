import promClient from 'prom-client';

const registry = new promClient.Registry();

promClient.collectDefaultMetrics({ register: registry });

// ── Métricas ──────────────────────────────────────────────────

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export {
  registry,
  httpRequestsTotal,
  httpRequestDurationSeconds,
};
