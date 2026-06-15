import winston from 'winston';
import { getSettings } from '../config';

export const logger = winston.createLogger({
  level: getSettings().logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      const base = `${timestamp} [${level}] ${message}`;
      return stack ? `${base}\n${stack}` : base;
    }),
  ),
  transports: [new winston.transports.Console()],
});
