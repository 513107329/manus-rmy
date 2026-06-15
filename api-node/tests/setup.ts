process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/manus_test?schema=public';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.STORAGE_MODE = 'local';
process.env.APP_CONFIG_FILEPATH = 'app_config.yaml';
