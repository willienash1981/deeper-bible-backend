import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('connect', () => console.log('Redis Client Connected!'));
redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis(): Promise<void> {
  if (!redisClient.isReady) {
    await redisClient.connect();
  }
}

export default redisClient;