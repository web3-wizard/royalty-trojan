import Redis from 'ioredis';

let redis: Redis | null = null;

export async function initRedis() {
  redis = new Redis(process.env.REDIS_URL!);
  redis.on('error', (err) => console.error('Redis error:', err));
}

export async function getCachedWallet(key: string): Promise<string | null> {
  if (!redis) return null;
  return redis.get(`wallet:${key}`);
}

export async function setCachedWallet(key: string, wallet: string, ttl: number): Promise<void> {
  if (!redis) return;
  await redis.setex(`wallet:${key}`, ttl, wallet);
}