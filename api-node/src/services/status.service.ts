import { getPrisma } from '../infrastructure/database/prisma';
import { getRedis } from '../infrastructure/redis/client';
import { HealthStatus } from '../domain/models';

export class StatusService {
  async checkAll(): Promise<HealthStatus[]> {
    const statuses: HealthStatus[] = [];

    try {
      await getPrisma().$queryRaw`SELECT 1`;
      statuses.push({ status: 'ok', service: 'postgres', detail: 'connected' });
    } catch (e) {
      statuses.push({ status: 'error', service: 'postgres', detail: (e as Error).message });
    }

    try {
      const redis = getRedis();
      if (redis.status !== 'ready') await redis.connect();
      await redis.ping();
      statuses.push({ status: 'ok', service: 'redis', detail: 'connected' });
    } catch (e) {
      statuses.push({ status: 'error', service: 'redis', detail: (e as Error).message });
    }

    return statuses;
  }
}

export const statusService = new StatusService();
