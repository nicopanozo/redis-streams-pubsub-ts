import Redis from 'ioredis';
import { logger } from '../common/logger';
import { config } from '../common/config';
import { MessagePayload, XReadGroupResult, PendingMessage } from '../types/messages';

export class Consumer {
  private redisClient: Redis;
  private streamName: string;
  private groupName: string;
  private consumerId: string;
  private batchSize: number;
  private blockMs: number;
  private processTimeMs: number;
  private isRunning: boolean;
  private messageCount: number;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
    this.streamName = config.REDIS_STREAM_NAME;
    this.groupName = config.REDIS_CONSUMER_GROUP;
    this.consumerId = config.CONSUMER_ID;
    this.batchSize = config.CONSUMER_BATCH_SIZE;
    this.blockMs = config.CONSUMER_BLOCK_MS;
    this.processTimeMs = config.CONSUMER_PROCESS_TIME_MS;
    this.isRunning = false;
    this.messageCount = 0;
  }

  /**
   * Inicializa el consumer group si no existe
   */
  async initConsumerGroup(): Promise<void> {
    try {
      // Intentar crear el consumer group
      await this.redisClient.xgroup('CREATE', this.streamName, this.groupName, '$', 'MKSTREAM');
      logger.info(
        { stream: this.streamName, group: this.groupName },
        'Consumer group created'
      );
    } catch (err) {
      // Si el grupo ya existe, está bien
      if ((err as Error).message.includes('BUSYGROUP')) {
        logger.info(
          { stream: this.streamName, group: this.groupName },
          'Consumer group already exists'
        );
      } else {
        logger.error(
          { error: (err as Error).message },
          'Error creating consumer group'
        );
        throw err;
      }
    }
  }

  /**
   * Lee mensajes nuevos del stream
   */
  async readNewMessages(): Promise<void> {
    try {
      // XREADGROUP para leer nuevos mensajes (>)
      const result = await this.redisClient.xreadgroup(
        'GROUP',
        this.groupName,
        this.consumerId,
        'COUNT',
        this.batchSize,
        'BLOCK',
        this.blockMs,
        'STREAMS',
        this.streamName,
        '>' // Leer solo mensajes nuevos
      ) as XReadGroupResult;
  
      // Si no hay nuevos mensajes, el resultado será null
      if (!result) {
        return;
      }
  
      // Verificar que el resultado tenga la estructura esperada
      if (!Array.isArray(result) || result.length === 0 || !Array.isArray(result[0]) || result[0].length < 2) {
        logger.warn({ result }, 'Unexpected result structure from xreadgroup');
        return;
      }
  
      const messages = result[0][1]; // [0] es el stream, [1] son los mensajes
      
      if (messages.length > 0) {
        logger.debug(
          { count: messages.length },
          'Received new messages'
        );
        
        // Procesar cada mensaje
        for (const msg of messages) {
          if (msg && msg.id && msg.message && msg.message.payload) {
            await this.processMessage(msg.id, msg.message.payload);
          } else {
            logger.warn(
              { message: msg },
              'Received message with invalid structure'
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Error reading new messages'
      );
      // No lanzar el error para permitir que el bucle continúe
    }
  }
  /**
   * Obtiene y reclama mensajes pendientes (no ACK)
   */
  async processPendingMessages(): Promise<void> {
    try {
      // Comprobar si hay mensajes pendientes para este consumidor
      const pendingInfo = await this.redisClient.xpending(
        this.streamName,
        this.groupName,
        '-',
        '+',
        this.batchSize
      );

      if (!pendingInfo || pendingInfo.length === 0) {
        return;
      }

      logger.info(
        { count: pendingInfo.length },
        'Found pending messages'
      );

      // Convertir la información de pendientes a un formato más útil
      const pendingMessages: PendingMessage[] = pendingInfo.map((p: any) => ({
        id: p[0],
        consumer: p[1],
        idleTime: p[2],
        deliveryCount: p[3]
      }));

      // Reclamar mensajes pendientes con XCLAIM
      for (const pending of pendingMessages) {
        // Solo reclamar mensajes que no pertenecen a este consumidor o han estado inactivos por un tiempo
        if (pending.consumer !== this.consumerId || pending.idleTime > 10000) {
          const claimResult = await this.redisClient.xclaim(
            this.streamName,
            this.groupName,
            this.consumerId,
            5000, // Min idle time
            pending.id
          );
          
          if (claimResult && claimResult.length > 0) {
            const claimData = claimResult[0] as unknown as [string, { payload: string }];
            const payload = claimData[1].payload;
            logger.info(
              { id: pending.id, idleTime: pending.idleTime, deliveryCount: pending.deliveryCount },
              'Claimed pending message'
            );
            
            // Procesar el mensaje reclamado
            await this.processMessage(pending.id, payload);
          }
        }
      }
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Error processing pending messages'
      );
      // No lanzar el error para permitir que el bucle continúe
    }
  }

  /**
   * Procesa un mensaje y hace ACK
   */
  async processMessage(id: string, rawPayload: string): Promise<void> {
    try {
      // Verificar que el payload no sea undefined o null
      if (!rawPayload) {
        logger.warn({ messageId: id }, 'Received empty payload');
        // ACK el mensaje para evitar reprocesamiento de mensajes inválidos
        await this.redisClient.xack(this.streamName, this.groupName, id);
        return;
      }
  
      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, this.processTimeMs));
      
      // Parsear la carga útil
      const payload: MessagePayload = JSON.parse(rawPayload);
      
      // Incrementar contador
      this.messageCount++;
      
      logger.info(
        { 
          messageId: id,
          messageCount: this.messageCount,
          payloadId: payload.id,
          timestamp: new Date(payload.timestamp).toISOString(),
          content: payload.content
        },
        'Processing message'
      );
      
      // ACK el mensaje (confirmación de procesamiento)
      await this.redisClient.xack(this.streamName, this.groupName, id);
      
      logger.debug(
        { messageId: id },
        'Message acknowledged'
      );
    } catch (error) {
      logger.error(
        { messageId: id, error: (error as Error).message, rawPayload },
        'Error processing message'
      );
      
      // Para errores de parsing, podemos decidir hacer ACK para evitar reprocesamiento infinito
      if ((error as Error).message.includes('Unexpected token')) {
        logger.warn(
          { messageId: id },
          'Acknowledging malformed message to prevent infinite reprocessing'
        );
        try {
          await this.redisClient.xack(this.streamName, this.groupName, id);
        } catch (ackError) {
          logger.error(
            { messageId: id, error: (ackError as Error).message },
            'Error acknowledging malformed message'
          );
        }
      }
      // Para otros errores, no hacemos ACK para que el mensaje permanezca pendiente
    }
  }
  /**
   * Inicia el bucle principal del consumidor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Consumer is already running');
      return;
    }
    
    this.isRunning = true;
    
    // Inicializar el grupo de consumidores
    await this.initConsumerGroup();
    
    logger.info(
      { 
        stream: this.streamName,
        group: this.groupName,
        consumerId: this.consumerId
      },
      'Starting consumer'
    );
    
    // Bucle principal
    while (this.isRunning) {
      // Primero procesar mensajes pendientes
      await this.processPendingMessages();
      
      // Luego leer nuevos mensajes
      await this.readNewMessages();
    }
  }

  /**
   * Detiene el consumidor
   */
  stop(): void {
    this.isRunning = false;
    logger.info('Consumer stopped');
  }

  /**
   * Obtiene información del consumer group
   */
  async getConsumerGroupInfo(): Promise<any> {
    const info = await this.redisClient.xinfo('STREAM', this.streamName) as any;
    return info || {};
  }
}