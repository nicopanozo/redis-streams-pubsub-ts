import { createRedisClient } from '../common/redis';
import { createLogger } from '../common/logger';
import { config } from '../common/config';
import { Consumer } from './consumer';

const logger = createLogger('consumer-service');

async function main() {
  try {
    logger.info('Starting consumer service');
    
    // Crear cliente Redis
    const redisClient = createRedisClient('consumer');
    
    // Crear y configurar Consumer
    const consumer = new Consumer(redisClient);
    
    // Manejar señales para una parada ordenada
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down');
      consumer.stop();
      await redisClient.quit();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down');
      consumer.stop();
      await redisClient.quit();
      process.exit(0);
    });
    
    // Iniciar consumidor
    await consumer.start();
    
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      'Error starting consumer service'
    );
    process.exit(1);
  }
}

// Iniciar aplicación
main();