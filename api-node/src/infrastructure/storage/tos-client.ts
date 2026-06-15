import { TosClient } from '@volcengine/tos-sdk';
import { getSettings } from '../../config';
import { logger } from '../../utils/logger';

let client: TosClient | null = null;

export function getTosClient(): TosClient {
  if (client) return client;
  const settings = getSettings();
  client = new TosClient({
    accessKeyId: settings.tosAccessKey,
    accessKeySecret: settings.tosSecretKey,
    region: settings.tosRegion,
    endpoint: settings.tosEndpoint,
  });
  logger.info('TOS client initialized');
  return client;
}

export function resetTosClient(): void {
  client = null;
}
