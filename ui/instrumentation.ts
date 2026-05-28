import type { LogLevel } from '@repo/common/client';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createUILoggerConfiguration } = await import('@repo/common');

    await createUILoggerConfiguration(process.env.LOG_LEVEL as LogLevel);
  }
}
