// Tipo para el payload que se envía en los mensajes
export interface MessagePayload {
    id: string;
    timestamp: number;
    content: string;
    data?: Record<string, unknown>;
  }
  
  // Tipo para representar un mensaje de Redis Stream
  export interface RedisStreamMessage {
    id: string;
    message: {
      payload: string; // JSON serializado del MessagePayload
    };
  }
  
  // Tipo para los resultados de XREADGROUP
  export type XReadGroupResult = [
    stream: string,
    messages: RedisStreamMessage[]
  ][];
  
  // Tipo para la información de PEL (Pending Entries List)
  export interface PendingMessage {
    id: string;
    consumer: string;
    idleTime: number;
    deliveryCount: number;
  }