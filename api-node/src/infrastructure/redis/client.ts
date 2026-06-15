import Redis from 'ioredis';
import { getSettings } from '../../config';
import { logger } from '../../utils/logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const settings = getSettings();
    redis = new Redis({
      host: settings.redisHost,
      port: settings.redisPort,
      password: settings.redisPassword ?? undefined,
      db: settings.redisDb,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
  }
  return redis;
}

export async function initRedis(): Promise<void> {
  const client = getRedis();
  await client.connect();
  logger.info('Redis client connected');
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis client disconnected');
  }
}

export function setRedisClient(client: Redis | null): void {
  redis = client;
}
