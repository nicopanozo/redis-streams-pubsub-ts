import { z } from 'zod';
import dotenv from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno desde .env
dotenv.config({ path: join(__dirname, '../../.env') });

// Esquema de validación para las variables de entorno
const configSchema = z.object({
  // Redis configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Stream configuration
  REDIS_STREAM_NAME: z.string().default('my_stream'),
  REDIS_CONSUMER_GROUP: z.string().default('my_group'),

  // Publisher settings
  PUBLISHER_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  PUBLISHER_MESSAGE_COUNT: z.coerce.number().int().positive().default(100),

  // Consumer settings
  CONSUMER_ID: z.string().default(`consumer_${process.env.HOSTNAME || 'unknown'}`),
  CONSUMER_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  CONSUMER_BLOCK_MS: z.coerce.number().int().positive().default(5000),
  CONSUMER_PROCESS_TIME_MS: z.coerce.number().int().positive().default(500),

  // Application
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

// Validar y obtener las variables de entorno
const envValidation = configSchema.safeParse(process.env);

if (!envValidation.success) {
  console.error('❌ Invalid environment variables:', envValidation.error.format());
  process.exit(1);
}

export const config = envValidation.data;