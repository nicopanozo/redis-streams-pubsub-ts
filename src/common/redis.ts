import Redis from 'ioredis';
import { config } from './config';
import { createLogger } from './logger';

const logger = createLogger('redis');

// Crear cliente Redis con reconexión automática y manejo de errores
export const createRedisClient = (name: string): Redis => {
  const client = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      logger.info({ name, times, delay }, 'Redis reconnecting...');
      return delay;
    },
  });

  client.on('connect', () => {
    logger.info({ name }, 'Redis connected');
  });

  client.on('error', (err) => {
    logger.error({ name, error: err.message }, 'Redis error');
  });

  client.on('close', () => {
    logger.warn({ name }, 'Redis connection closed');
  });

  return client;
};