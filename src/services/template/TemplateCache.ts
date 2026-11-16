/**
 * TemplateCache - Cache compiled templates for performance
 *
 * Provides Redis-based caching with TTL support and hash-based keys.
 */

import Redis from "ioredis";
import crypto from "crypto";
import { TemplateCache as ITemplateCache, CompiledTemplate } from "./types";

export class RedisTemplateCache implements ITemplateCache {
  private redis: Redis;
  private prefix = "template:compiled:";
  private defaultTTL = 3600; // 1 hour

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get compiled template from cache
   *
   * @param key - Cache key (usually template hash)
   * @returns Compiled template or undefined if not found
   */
  async get(key: string): Promise<CompiledTemplate | undefined> {
    try {
      const data = await this.redis.get(this.prefix + key);
      if (!data) {
        return undefined;
      }

      const parsed = JSON.parse(data);

      // Reconstruct Date objects
      if (parsed.compiledAt) {
        parsed.compiledAt = new Date(parsed.compiledAt);
      }

      return parsed as CompiledTemplate;
    } catch (error) {
      console.error("Cache get error:", error);
      return undefined;
    }
  }

  /**
   * Store compiled template in cache
   *
   * @param key - Cache key
   * @param template - Compiled template to store
   * @param ttl - Time to live in seconds (default: 3600)
   */
  async set(key: string, template: CompiledTemplate, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(template);
      const actualTTL = ttl ?? this.defaultTTL;

      await this.redis.setex(this.prefix + key, actualTTL, serialized);
    } catch (error) {
      console.error("Cache set error:", error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Invalidate cache entry
   *
   * @param key - Cache key to invalidate
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefix + key);
    } catch (error) {
      console.error("Cache invalidate error:", error);
    }
  }

  /**
   * Clear all cached templates
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(this.prefix + "*");
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  /**
   * Generate cache key from template content
   *
   * @param template - Template string
   * @returns Hash-based cache key
   */
  static generateKey(template: string): string {
    return crypto.createHash("sha256").update(template).digest("hex").substring(0, 32); // Use first 32 chars for shorter keys
  }
}

/**
 * In-memory cache implementation (fallback when Redis is not available)
 */
export class InMemoryTemplateCache implements ITemplateCache {
  private cache: Map<string, { template: CompiledTemplate; expiresAt: number }>;
  private defaultTTL = 3600; // 1 hour

  constructor() {
    this.cache = new Map();

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async get(key: string): Promise<CompiledTemplate | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.template;
  }

  async set(key: string, template: CompiledTemplate, ttl?: number): Promise<void> {
    const actualTTL = ttl ?? this.defaultTTL;
    const expiresAt = Date.now() + actualTTL * 1000;

    this.cache.set(key, { template, expiresAt });
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key from template content
   *
   * @param template - Template string
   * @returns Hash-based cache key
   */
  static generateKey(template: string): string {
    return crypto.createHash("sha256").update(template).digest("hex").substring(0, 32);
  }
}
