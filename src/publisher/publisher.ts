import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../common/logger';
import { config } from '../common/config';
import { MessagePayload } from '../types/messages';

const logger = createLogger('publisher');

export class Publisher {
  private redisClient: Redis;
  private streamName: string;
  private messageCount: number;
  private isRunning: boolean;
  private publishInterval: NodeJS.Timeout | null;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
    this.streamName = config.REDIS_STREAM_NAME;
    this.messageCount = 0;
    this.isRunning = false;
    this.publishInterval = null;
  }

  /**
   * Publica un mensaje único en el stream
   */
  async publishMessage(): Promise<string> {
    try {
      const payload: MessagePayload = {
        id: uuidv4(),
        timestamp: Date.now(),
        content: `Message #${this.messageCount + 1}`,
        data: {
          random: Math.random(),
          publisher: process.env.HOSTNAME || 'unknown',
        },
      };

      const serializedPayload = JSON.stringify(payload);
      
      // Usar XADD para publicar el mensaje en el stream
      const messageId = await this.redisClient.xadd(
        this.streamName,
        '*', // ID generado automáticamente por Redis
        'payload',
        serializedPayload
      );

      this.messageCount++;
      logger.debug(
        { messageId, payload },
        `Message published to stream ${this.streamName}`
      );

      // Fix: Handle null case
      return messageId ?? '';
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Error publishing message'
      );
      throw error;
    }
  }

  /**
   * Inicia el bucle de publicación periódica
   */
  startPublishing(intervalMs = config.PUBLISHER_INTERVAL_MS): void {
    if (this.isRunning) {
      logger.warn('Publisher is already running');
      return;
    }

    this.isRunning = true;
    logger.info(
      { interval: intervalMs },
      'Starting publisher with interval'
    );

    this.publishInterval = setInterval(async () => {
      await this.publishMessage();
    }, intervalMs);
  }

  /**
   * Detiene el bucle de publicación
   */
  stopPublishing(): void {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
    this.isRunning = false;
    logger.info('Publisher stopped');
  }

  /**
   * Publica un lote específico de mensajes
   */
  async publishBatch(count: number): Promise<string[]> {
    const messageIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = await this.publishMessage();
      messageIds.push(id);
    }
    
    logger.info(
      { count, firstId: messageIds[0], lastId: messageIds[messageIds.length - 1] },
      `Published batch of ${count} messages`
    );
    
    return messageIds;
  }

  /**
   * Obtiene las estadísticas del stream
   */
  async getStreamInfo(): Promise<Record<string, any>> {
    const infoArray = await this.redisClient.xinfo('STREAM', this.streamName) as Array<string | number>;
    
    // Convertir la respuesta de Redis a un objeto más fácil de usar
    const result: Record<string, any> = {};
    
    // Fix: Check if infoArray is an array and has length property
    if (Array.isArray(infoArray)) {
      for (let i = 0; i < infoArray.length; i += 2) {
        const key = String(infoArray[i]);
        result[key] = infoArray[i + 1];
      }
    }
    
    return result;
  }
}