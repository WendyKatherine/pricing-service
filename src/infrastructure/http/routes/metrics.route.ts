import { FastifyInstance } from 'fastify';
import { registry } from '../../observability/metrics';

export async function metricsRoute(app: FastifyInstance): Promise<void> {
  app.get('/metrics', async (_request, reply) => {
    const metrics = await registry.metrics();
    return reply.type('text/plain').send(metrics);
  });
}
