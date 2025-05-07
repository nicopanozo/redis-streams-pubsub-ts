Redis Streams PubSub TypeScript
A robust implementation of the Publisher-Consumer pattern using Redis Streams with TypeScript. This project demonstrates real-time data streaming with multiple consumers processing messages from a Redis stream.

## Overview

This application consists of two main components:
- **Publisher**: Publishes messages to a Redis stream at regular intervals
- **Consumer**: Processes messages from the stream with consumer group support for reliable message delivery

The system leverages Redis Streams for durable, append-only messaging with consumer group capabilities that ensure each message is processed exactly once, even with multiple consumer instances.

## Features

- **Redis Streams**: Utilizes Redis' built-in stream data structure for reliable messaging
- **Consumer Groups**: Implements Redis consumer groups for distributed message processing
- **Message Acknowledgment**: Ensures reliable delivery with explicit message acknowledgment
- **Pending Message Handling**: Automatically reclaims and processes messages that weren't acknowledged
- **Scalable Architecture**: Supports multiple consumer instances processing messages in parallel
- **Docker Support**: Fully containerized application with Docker Compose for easy deployment

## Prerequisites

- Node.js 18+
- Redis 7+
- Docker and Docker Compose (for containerized deployment)

## Project Structure
redis-streams-pubsub-ts/
├── src/
│   ├── common/
│   │   ├── config.ts       # Configuration using environment variables
│   │   ├── logger.ts       # Logging utility using Pino
│   │   └── redis.ts        # Redis client factory
│   ├── consumer/
│   │   ├── consumer.ts     # Consumer implementation
│   │   └── index.ts        # Consumer entry point
│   ├── publisher/
│   │   ├── publisher.ts    # Publisher implementation
│   │   └── index.ts        # Publisher entry point
│   └── types/
│       └── messages.ts     # TypeScript interfaces for messages
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Multi-container Docker setup
├── package.json            # Project dependencies and scripts
└── tsconfig.json           # TypeScript configuration

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/redis-streams-pubsub-ts.git
   cd redis-streams-pubsub-ts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with the following content:
   ```plaintext
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_STREAM_NAME=my_stream
   REDIS_CONSUMER_GROUP=my_group
   PUBLISHER_INTERVAL_MS=1000
   CONSUMER_BATCH_SIZE=10
   CONSUMER_BLOCK_MS=5000
   CONSUMER_PROCESS_TIME_MS=500
   LOG_LEVEL=info
   ```

4. Start Redis (if not already running):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

5. Build the TypeScript code:
   ```bash
   npm run build
   ```

6. Run the publisher and consumer in separate terminals:
   - **Terminal 1**
     ```bash
     npm run start:publisher
     ```
   - **Terminal 2**
     ```bash
     npm run start:consumer
     ```

### Docker Deployment

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

   If you encounter any issues with container recreation, try:
   ```bash
   docker-compose down
   docker volume prune -f
   docker-compose up --build --force-recreate
   ```

## How It Works

### Publisher

The publisher creates messages with unique IDs and timestamps, then adds them to a Redis stream using the `XADD` command. It can publish messages at regular intervals or in batches.

### Consumer

Consumers operate within a consumer group to process messages collaboratively:

1. **Consumer Group**: Multiple consumers join the same group to distribute message processing
2. **Message Claiming**: Each message is assigned to only one consumer in the group
3. **Acknowledgment**: After successful processing, messages are acknowledged with `XACK`
4. **Pending Messages**: Unacknowledged messages are automatically reclaimed and reprocessed
5. **Idempotent Processing**: Messages are designed to be safely processed multiple times if needed

## Configuration Options

Environment Variable | Description | Default
---------------------|-------------|--------
REDIS_HOST | Redis server hostname | localhost
REDIS_PORT | Redis server port | 6379
REDIS_PASSWORD | Redis password (optional) | -
REDIS_STREAM_NAME | Name of the Redis stream | my_stream
REDIS_CONSUMER_GROUP | Consumer group name | my_group
PUBLISHER_INTERVAL_MS | Interval between published messages | 1000
CONSUMER_ID | Unique consumer identifier | consumer_[hostname]
CONSUMER_BATCH_SIZE | Number of messages to read in one batch | 10
CONSUMER_BLOCK_MS | Time to block waiting for new messages | 5000
CONSUMER_PROCESS_TIME_MS | Simulated processing time per message | 500
LOG_LEVEL | Logging level (trace, debug, info, warn, error, fatal) | info

## Scaling

The application is designed to scale horizontally. You can increase the number of consumer replicas in the `docker-compose.yml` file:

```yaml
consumer:
  ...
  deploy:
    replicas: 5  # Increase this number to add more consumers
```

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**:
   - Verify Redis is running and accessible
   - Check `REDIS_HOST` and `REDIS_PORT` environment variables

2. **Docker Compose Errors**:
   - Try the sequence: `docker-compose down`, `docker volume prune -f`, `docker-compose up --build --force-recreate`

3. **Message Processing Issues**:
   - Check the consumer logs for errors
   - Verify consumer group creation was successful

## Dependencies

- ioredis: Redis client for Node.js
- pino: Fast, low-overhead logging
- pino-pretty: Pretty-printing for Pino logs
- zod: TypeScript-first schema validation
- dotenv: Environment variable management
- uuid: Unique ID