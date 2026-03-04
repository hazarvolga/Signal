import Redis from "ioredis";

class RedisService {
  private client: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 50, 2000);
        }
      });
      this.client.on('error', (err: any) => {
        if (err.code === 'ECONNREFUSED') {
          console.warn(`Redis connection refused at ${process.env.REDIS_URL}. Caching disabled.`);
          this.client?.disconnect();
          this.client = null;
        } else {
          console.error("Redis error:", err);
        }
      });
      console.log("Redis connection initialized.");
    } else {
      console.warn("REDIS_URL not set. Caching disabled.");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ remaining: number, reset: number }> {
    if (!this.client) return { remaining: limit, reset: Date.now() + windowSeconds * 1000 };
    
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    
    const ttl = await this.client.ttl(key);
    return {
      remaining: Math.max(0, limit - count),
      reset: Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000
    };
  }
}

export const redisService = new RedisService();
