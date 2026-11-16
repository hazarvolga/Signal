import Redis from "ioredis";
import { logger } from "./logger";

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
        },
      });
      this.client.on("error", (err: any) => {
        if (err.code === "ECONNREFUSED") {
          logger.warn({ code: err.code }, "Redis connection refused; caching disabled");
          this.client?.disconnect();
          this.client = null;
        } else {
          logger.error({ code: err?.code, name: err?.name }, "Redis client error");
        }
      });
      logger.info("Redis connection initialized");
    } else {
      logger.warn("REDIS_URL is not set; caching disabled");
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

  disconnect(): void {
    this.client?.disconnect();
    this.client = null;
  }

  async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    if (!this.client) {
      return {
        allowed: process.env.NODE_ENV !== "production",
        remaining: process.env.NODE_ENV === "production" ? 0 : limit,
        reset: Date.now() + windowSeconds * 1000,
      };
    }

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    const ttl = await this.client.ttl(key);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000,
    };
  }
}

export const redisService = new RedisService();
