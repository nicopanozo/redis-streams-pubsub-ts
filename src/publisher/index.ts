import { createRedisClient } from '../common/redis';
import { createLogger } from '../common/logger';
import { config } from '../common/config';
import { Publisher } from './publisher';

const logger = createLogger('publisher-service');

async function main() {
  try {
    logger.info('Starting publisher service');
    
    // Crear cliente Redis
    const redisClient = createRedisClient('publisher');
    
    // Crear y configurar Publisher
    const publisher = new Publisher(redisClient);
    
    // Manejar señales para una parada ordenada
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down');
      publisher.stopPublishing();
      await redisClient.quit();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down');
      publisher.stopPublishing();
      await redisClient.quit();
      process.exit(0);
    });
    
    // Iniciar publicación periódica
    publisher.startPublishing();
    
    logger.info(
      { 
        interval: config.PUBLISHER_INTERVAL_MS,
        stream: config.REDIS_STREAM_NAME 
      },
      'Publisher service started'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      'Error starting publisher service'
    );
    process.exit(1);
  }
}

// Iniciar aplicación
main();