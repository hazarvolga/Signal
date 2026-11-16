/**
 * Property-Based Tests for TemplateCache
 */

import * as fc from 'fast-check';
import { vi } from 'vitest';
import { InMemoryTemplateCache } from '../../../src/services/template/TemplateCache';
import { CompiledTemplate, TemplateAST } from '../../../src/services/template/types';

describe('TemplateCache - Property Tests', () => {
  let cache: InMemoryTemplateCache;

  beforeEach(() => {
    cache = new InMemoryTemplateCache();
  });

  /**
   * Property 46: Cache Invalidation
   * 
   * For any template that is updated, subsequent renders should reflect
   * the updated template content, not cached old content.
   * 
   * Validates: Requirements 13.6
   */
  describe('Property 46: Cache Invalidation', () => {
    it('should invalidate cache when template is updated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // template content v1
          fc.string({ minLength: 1, maxLength: 100 }), // template content v2
          async (template1, template2) => {
            // Ensure templates are different
            if (template1 === template2) {
              template2 = template2 + '_modified';
            }

            // Generate keys
            const key1 = InMemoryTemplateCache.generateKey(template1);
            const key2 = InMemoryTemplateCache.generateKey(template2);

            // Create compiled templates
            const compiled1: CompiledTemplate = {
              ast: { type: 'root', children: [] } as TemplateAST,
              hash: key1,
              compiledAt: new Date(),
              metadata: { variableCount: 1, filterCount: 0, loopCount: 0 },
            };

            const compiled2: CompiledTemplate = {
              ast: { type: 'root', children: [] } as TemplateAST,
              hash: key2,
              compiledAt: new Date(),
              metadata: { variableCount: 2, filterCount: 1, loopCount: 0 },
            };

            // Cache first version
            await cache.set(key1, compiled1);
            const retrieved1 = await cache.get(key1);
            expect(retrieved1?.hash).toBe(key1);

            // Invalidate first version
            await cache.invalidate(key1);

            // First version should no longer be cached
            const afterInvalidate = await cache.get(key1);
            expect(afterInvalidate).toBeUndefined();

            // Cache second version
            await cache.set(key2, compiled2);
            const retrieved2 = await cache.get(key2);
            expect(retrieved2?.hash).toBe(key2);
            expect(retrieved2?.metadata.variableCount).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple invalidations without errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (template) => {
            const key = InMemoryTemplateCache.generateKey(template);
            const compiled: CompiledTemplate = {
              ast: { type: 'root', children: [] } as TemplateAST,
              hash: key,
              compiledAt: new Date(),
              metadata: { variableCount: 0, filterCount: 0, loopCount: 0 },
            };

            // Set and invalidate multiple times
            await cache.set(key, compiled);
            await cache.invalidate(key);
            await cache.invalidate(key); // Second invalidation should not throw
            await cache.invalidate(key); // Third invalidation should not throw

            // Should still be undefined
            const retrieved = await cache.get(key);
            expect(retrieved).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Cache Key Consistency
   * 
   * For any template string, generating a cache key multiple times
   * should always produce the same result.
   */
  describe('Property: Cache Key Consistency', () => {
    it('should generate consistent keys for same template', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (template) => {
            const key1 = InMemoryTemplateCache.generateKey(template);
            const key2 = InMemoryTemplateCache.generateKey(template);
            const key3 = InMemoryTemplateCache.generateKey(template);

            expect(key1).toBe(key2);
            expect(key2).toBe(key3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different keys for different templates', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (template1, template2) => {
            // Skip if templates are identical
            if (template1 === template2) {
              return;
            }

            const key1 = InMemoryTemplateCache.generateKey(template1);
            const key2 = InMemoryTemplateCache.generateKey(template2);

            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Cache Set-Get Round Trip
   * 
   * For any compiled template, storing it in cache and retrieving it
   * should return an equivalent template.
   */
  describe('Property: Cache Set-Get Round Trip', () => {
    it('should preserve template data through cache round trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          fc.record({
            variableCount: fc.integer({ min: 0, max: 100 }),
            filterCount: fc.integer({ min: 0, max: 50 }),
            loopCount: fc.integer({ min: 0, max: 20 }),
          }),
          async (hash, metadata) => {
            const key = 'test-' + hash;
            const compiled: CompiledTemplate = {
              ast: { type: 'root', children: [] } as TemplateAST,
              hash,
              compiledAt: new Date(),
              metadata,
            };

            // Store in cache
            await cache.set(key, compiled);

            // Retrieve from cache
            const retrieved = await cache.get(key);

            // Should match original
            expect(retrieved).toBeDefined();
            expect(retrieved?.hash).toBe(hash);
            expect(retrieved?.metadata.variableCount).toBe(metadata.variableCount);
            expect(retrieved?.metadata.filterCount).toBe(metadata.filterCount);
            expect(retrieved?.metadata.loopCount).toBe(metadata.loopCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: TTL Expiration
   * 
   * For any template cached with a TTL, it should be available before
   * expiration and unavailable after expiration.
   */
  describe('Property: TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      vi.useFakeTimers();
      try {
        await fc.assert(
          fc.asyncProperty(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
            async (hash) => {
              const key = 'expiring-' + hash;
              const compiled: CompiledTemplate = {
                ast: { type: 'root', children: [] } as TemplateAST,
                hash,
                compiledAt: new Date(),
                metadata: { variableCount: 0, filterCount: 0, loopCount: 0 },
              };

              await cache.set(key, compiled, 1);
              expect(await cache.get(key)).toBeDefined();

              await vi.advanceTimersByTimeAsync(1100);

              expect(await cache.get(key)).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  /**
   * Additional Property: Clear Operation
   * 
   * For any set of cached templates, calling clear() should remove all entries.
   */
  describe('Property: Clear Operation', () => {
    it('should remove all entries on clear', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
            { minLength: 1, maxLength: 20 }
          ),
          async (hashes) => {
            // Cache multiple templates
            for (const hash of hashes) {
              const key = 'test-' + hash;
              const compiled: CompiledTemplate = {
                ast: { type: 'root', children: [] } as TemplateAST,
                hash,
                compiledAt: new Date(),
                metadata: { variableCount: 0, filterCount: 0, loopCount: 0 },
              };
              await cache.set(key, compiled);
            }

            // Verify all are cached
            for (const hash of hashes) {
              const key = 'test-' + hash;
              const retrieved = await cache.get(key);
              expect(retrieved).toBeDefined();
            }

            // Clear cache
            await cache.clear();

            // Verify all are removed
            for (const hash of hashes) {
              const key = 'test-' + hash;
              const retrieved = await cache.get(key);
              expect(retrieved).toBeUndefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
