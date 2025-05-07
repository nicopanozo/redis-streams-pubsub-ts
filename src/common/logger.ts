import pino from 'pino';
import { config } from './config';

// Crear logger con configuración basada en variables de entorno
export const logger = pino({
  level: config.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// Exportar instancias específicas para diferentes módulos
export const createLogger = (name: string) => logger.child({ name });