import dotenv from 'dotenv';

dotenv.config();

export interface Settings {
  logLevel: string;
  serverTimeoutMinutes: number | null;
  port: number;
}

let cachedSettings: Settings | null = null;

export function getSettings(): Settings {
  if (cachedSettings) return cachedSettings;

  const timeoutRaw =
    process.env.SERVICE_TIMEOUT_MINUTES ?? process.env.SERVER_TIMEOUT_MINUTES;
  cachedSettings = {
    logLevel: process.env.LOG_LEVEL ?? 'info',
    serverTimeoutMinutes:
      timeoutRaw === undefined || timeoutRaw === ''
        ? 60
        : Number.isNaN(Number(timeoutRaw))
          ? 60
          : Number(timeoutRaw),
    port: Number(process.env.PORT ?? 8000),
  };
  return cachedSettings;
}

export function resetSettingsCache(): void {
  cachedSettings = null;
}
