import { PrismaClient } from '@prisma/client';
import { getSettings } from '../../config';
import { logger } from '../../utils/logger';

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: getSettings().databaseUrl } },
    });
  }
  return prisma;
}

export async function initDatabase(): Promise<void> {
  const client = getPrisma();
  await client.$connect();
  logger.info('Postgres database connected');
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Postgres database disconnected');
  }
}

export function setPrismaClient(client: PrismaClient | null): void {
  prisma = client;
}
