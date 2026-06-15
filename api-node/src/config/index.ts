import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

export interface Settings {
  env: string;
  logLevel: string;
  logFile: string;
  port: number;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string | null;
  redisDb: number;
  tosAccessKey: string;
  tosSecretKey: string;
  tosEndpoint: string;
  tosRegion: string;
  tosBucket: string;
  sandboxAddress: string | null;
  sandboxImage: string | null;
  sandboxNamePrefix: string | null;
  sandboxTtlMinutes: number;
  sandboxNetwork: string | null;
  sandboxChromeArgs: string | null;
  sandboxHttpsProxy: string | null;
  sandboxHttpProxy: string | null;
  sandboxNoProxy: string | null;
  appConfigFilepath: string;
  storageMode: 'local' | 'tos';
}

let cached: Settings | null = null;

export function getSettings(): Settings {
  if (cached) return cached;
  cached = {
    env: process.env.ENV ?? 'develop',
    logLevel: process.env.LOG_LEVEL ?? 'INFO',
    logFile: process.env.LOG_FILE ?? 'logs/app.log',
    port: Number(process.env.PORT ?? 8080),
    databaseUrl: process.env.DATABASE_URL ?? '',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: Number(process.env.REDIS_PORT ?? 6379),
    redisPassword: process.env.REDIS_PASSWORD || null,
    redisDb: Number(process.env.REDIS_DB ?? 0),
    tosAccessKey: process.env.TOS_ACCESS_KEY ?? '',
    tosSecretKey: process.env.TOS_SECRET_KEY ?? '',
    tosEndpoint: process.env.TOS_ENDPOINT ?? '',
    tosRegion: process.env.TOS_REGION ?? '',
    tosBucket: process.env.TOS_BUCKET ?? '',
    sandboxAddress: process.env.SANDBOX_ADDRESS || null,
    sandboxImage: process.env.SANDBOX_IMAGE || 'manus-sandbox-node',
    sandboxNamePrefix: process.env.SANDBOX_NAME_PREFIX || 'manus-sandbox',
    sandboxTtlMinutes: Number(process.env.SANDBOX_TTL_MINUTES ?? 60),
    sandboxNetwork: process.env.SANDBOX_NETWORK || null,
    sandboxChromeArgs: process.env.SANDBOX_CHROME_ARGS || null,
    sandboxHttpsProxy: process.env.SANDBOX_HTTPS_PROXY || null,
    sandboxHttpProxy: process.env.SANDBOX_HTTP_PROXY || null,
    sandboxNoProxy: process.env.SANDBOX_NO_PROXY || null,
    appConfigFilepath: process.env.APP_CONFIG_FILEPATH ?? 'app_config.yaml',
    storageMode: (process.env.STORAGE_MODE as 'local' | 'tos') ?? 'local',
  };
  return cached;
}

export function resetSettingsCache(): void {
  cached = null;
}
