import { Pool } from 'pg';
import promClient from 'prom-client';
import { registry } from './metrics';

let poolRef: Pool | null = null;

export function setPoolTarget(pool: Pool): void {
  poolRef = pool;
}

export const dbPoolConnections = new promClient.Gauge({
  name: 'db_pool_connections',
  help: 'PostgreSQL pool connection states (total, idle, waiting)',
  labelNames: ['state'] as const,
  registers: [registry],
  collect(this: promClient.Gauge<string>) {
    const p = poolRef;
    this.set({ state: 'total' }, p?.totalCount ?? 0);
    this.set({ state: 'idle' }, p?.idleCount ?? 0);
    this.set({ state: 'waiting' }, p?.waitingCount ?? 0);
  },
});