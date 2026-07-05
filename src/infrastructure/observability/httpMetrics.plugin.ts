import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { httpRequestsTotal, httpRequestDurationSeconds } from './metrics';

const timingMap = new WeakMap<FastifyRequest, number>();

async function httpMetricsPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request) => {
    timingMap.set(request, Date.now());
  });

  app.addHook('onResponse', async (request, reply) => {
    const method = request.method;
    const route = request.routeOptions?.url ?? 'unknown';
    const statusCode = String(reply.statusCode);
    const labels = { method, route, status_code: statusCode };

    httpRequestsTotal.inc(labels);

    const timingStart = timingMap.get(request);
    if (timingStart !== undefined) {
      const durationSec = (Date.now() - timingStart) / 1000;
      httpRequestDurationSeconds.observe(labels, durationSec);
    }
  });
}

export default fp(httpMetricsPlugin, { name: 'http-metrics' });