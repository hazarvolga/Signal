/**
 * Unit Tests for TemplateCache
 */

import { InMemoryTemplateCache, RedisTemplateCache } from '../../../src/services/template/TemplateCache';
import { CompiledTemplate, TemplateAST } from '../../../src/services/template/types';

describe('InMemoryTemplateCache', () => {
  let cache: InMemoryTemplateCache;

  beforeEach(() => {
    cache = new InMemoryTemplateCache();
  });

  describe('get() and set()', () => {
    it('should store and retrieve compiled template', async () => {
      const key = 'test-key';
      const template: CompiledTemplate = {
        ast: { type: 'root', children: [] } as TemplateAST,
        hash: 'abc123',
        compiledAt: new Date(),
        metadata: {
          variableCount: 2,
          filterCount: 1,
          loopCount: 0,
        },
      };

      await cache.set(key, template);
      const retrieved = await cache.get(key);

      expect(retrieved).toBeDefined();
      expect(retrieved?.hash).toBe('abc123');
      expect(retrieved?.metadata.variableCount).toBe(2);
    });

    it('should return undefined for non-existent key', async () => {
      const retrieved = await cache.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'expiring-key';
      const template: CompiledTemplate = {
        ast: { type: 'root', children: [] } as TemplateAST,
        hash: 'xyz789',
        compiledAt: new Date(),
        metadata: {
          variableCount: 0,
          filterCount: 0,
          loopCount: 0,
        },
      };

      // Set with 1 second TTL
      await cache.set(key, template, 1);

      // Should be available immediately
      let retrieved = await cache.get(key);
      expect(retrieved).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      retrieved = await cache.get(key);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('invalidate()', () => {
    it('should remove entry from cache', async () => {
      const key = 'test-key';
      const template: CompiledTemplate = {
        ast: { type: 'root', children: [] } as TemplateAST,
        hash: 'abc123',
        compiledAt: new Date(),
        metadata: {
          variableCount: 0,
          filterCount: 0,
          loopCount: 0,
        },
      };

      await cache.set(key, template);
      expect(await cache.get(key)).toBeDefined();

      await cache.invalidate(key);
      expect(await cache.get(key)).toBeUndefined();
    });

    it('should not throw for non-existent key', async () => {
      await expect(cache.invalidate('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should remove all entries', async () => {
      const template: CompiledTemplate = {
        ast: { type: 'root', children: [] } as TemplateAST,
        hash: 'abc123',
        compiledAt: new Date(),
        metadata: {
          variableCount: 0,
          filterCount: 0,
          loopCount: 0,
        },
      };

      await cache.set('key1', template);
      await cache.set('key2', template);
      await cache.set('key3', template);

      expect(await cache.get('key1')).toBeDefined();
      expect(await cache.get('key2')).toBeDefined();
      expect(await cache.get('key3')).toBeDefined();

      await cache.clear();

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
      expect(await cache.get('key3')).toBeUndefined();
    });
  });

  describe('generateKey()', () => {
    it('should generate consistent hash for same template', () => {
      const template = 'Hello {{name}}';
      
      const key1 = InMemoryTemplateCache.generateKey(template);
      const key2 = InMemoryTemplateCache.generateKey(template);
      
      expect(key1).toBe(key2);
    });

    it('should generate different hashes for different templates', () => {
      const template1 = 'Hello {{name}}';
      const template2 = 'Hello {{user}}';
      
      const key1 = InMemoryTemplateCache.generateKey(template1);
      const key2 = InMemoryTemplateCache.generateKey(template2);
      
      expect(key1).not.toBe(key2);
    });

    it('should generate 32-character hash', () => {
      const template = 'Hello {{name}}';
      const key = InMemoryTemplateCache.generateKey(template);
      
      expect(key.length).toBe(32);
    });
  });
});

// Note: RedisTemplateCache tests would require a Redis instance
// In a real implementation, we'd use a mock or test container
describe('RedisTemplateCache', () => {
  describe('generateKey()', () => {
    it('should generate consistent hash for same template', () => {
      const template = 'Hello {{name}}';
      
      const key1 = RedisTemplateCache.generateKey(template);
      const key2 = RedisTemplateCache.generateKey(template);
      
      expect(key1).toBe(key2);
    });

    it('should generate different hashes for different templates', () => {
      const template1 = 'Hello {{name}}';
      const template2 = 'Hello {{user}}';
      
      const key1 = RedisTemplateCache.generateKey(template1);
      const key2 = RedisTemplateCache.generateKey(template2);
      
      expect(key1).not.toBe(key2);
    });

    it('should generate 32-character hash', () => {
      const template = 'Hello {{name}}';
      const key = RedisTemplateCache.generateKey(template);
      
      expect(key.length).toBe(32);
    });
  });
});
