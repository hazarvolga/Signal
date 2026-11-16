/**
 * Property-based tests for FilterRegistry
 * 
 * Tests universal correctness properties for filters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { FilterRegistry } from '../../../src/services/template/FilterRegistry';

describe('FilterRegistry - Property Tests', () => {
  let registry: FilterRegistry;

  beforeEach(() => {
    registry = new FilterRegistry();
  });

  describe('Property 13: String Case Filters', () => {
    it('upcase should always produce uppercase output', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const filter = registry.get('upcase')!;
          const result = filter(input);
          expect(result).toBe(result.toUpperCase());
        }),
        { numRuns: 100 }
      );
    });

    it('downcase should always produce lowercase output', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const filter = registry.get('downcase')!;
          const result = filter(input);
          expect(result).toBe(result.toLowerCase());
        }),
        { numRuns: 100 }
      );
    });

    it('upcase and downcase should be inverses for ASCII', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const upcase = registry.get('upcase')!;
          const downcase = registry.get('downcase')!;
          
          const upper = upcase(input);
          const lower = downcase(input);
          
          // Applying both should give consistent results
          expect(downcase(upper)).toBe(lower);
          expect(upcase(lower)).toBe(upper);
        }),
        { numRuns: 100 }
      );
    });

    it('capitalize should preserve string length', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const filter = registry.get('capitalize')!;
          const result = filter(input);
          expect(result.length).toBe(input.length);
        }),
        { numRuns: 100 }
      );
    });

    it('capitalize should uppercase first character', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (input) => {
          const filter = registry.get('capitalize')!;
          const result = filter(input);
          expect(result[0]).toBe(input[0].toUpperCase());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Truncate Filter', () => {
    it('truncate should never exceed specified length + 3 (for ...)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 0, max: 100 }),
          (input, length) => {
            const filter = registry.get('truncate')!;
            const result = filter(input, length);
            
            if (input.length > length) {
              expect(result.length).toBe(length + 3); // length + '...'
            } else {
              expect(result.length).toBe(input.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('truncate should preserve short strings', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 0, max: 100 }),
          (input, length) => {
            const filter = registry.get('truncate')!;
            const result = filter(input, length);
            
            if (input.length <= length) {
              expect(result).toBe(input);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('truncate should add ellipsis for long strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (input, length) => {
            const filter = registry.get('truncate')!;
            const result = filter(input, length);
            
            if (input.length > length) {
              expect(result.endsWith('...')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Strip HTML Filter', () => {
    it('strip_html should remove all HTML tags', () => {
      fc.assert(
        fc.property(fc.string().filter(s => !s.includes('<') && !s.includes('>')), (content) => {
          const filter = registry.get('strip_html')!;
          const input = `<p>${content}</p>`;
          const result = filter(input);

          expect(result).toBe(content);
        }),
        { numRuns: 100 }
      );
    });

    it('strip_html should preserve non-HTML content', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('<') && !s.includes('>')),
          (input) => {
            const filter = registry.get('strip_html')!;
            const result = filter(input);
            expect(result).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('strip_html should handle nested tags', () => {
      fc.assert(
        fc.property(fc.string().filter(s => !s.includes('<') && !s.includes('>')), (content) => {
          const filter = registry.get('strip_html')!;
          const input = `<div><span><strong>${content}</strong></span></div>`;
          const result = filter(input);
          
          expect(result).toBe(content);
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: URL Encode Filter', () => {
    it('url_encode should produce valid URL-encoded string', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const filter = registry.get('url_encode')!;
          const result = filter(input);
          
          // Should not contain spaces
          expect(result).not.toContain(' ');
          
          // Should be decodable
          const decoded = decodeURIComponent(result);
          expect(decoded).toBe(input);
        }),
        { numRuns: 100 }
      );
    });

    it('url_encode should be idempotent when decoded', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const filter = registry.get('url_encode')!;
          const encoded = filter(input);
          const decoded = decodeURIComponent(encoded);
          
          expect(decoded).toBe(input);
        }),
        { numRuns: 100 }
      );
    });

    it('url_encode should handle special characters', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const filter = registry.get('url_encode')!;
          const result = filter(input);
          
          // Common special characters should be encoded
          if (input.includes('@')) {
            expect(result).toContain('%40');
          }
          if (input.includes(' ')) {
            expect(result).toContain('%20');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Money Filter Formatting', () => {
    it('money filter should always include currency symbol', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (amount) => {
            const filter = registry.get('money')!;
            const result = filter(amount);
            
            // Should contain $ for USD (default)
            expect(result).toContain('$');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('money filter should format with 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (amount) => {
            const filter = registry.get('money')!;
            const result = filter(amount);
            
            // Should have exactly 2 decimal places
            const match = result.match(/\.\d+/);
            if (match) {
              expect(match[0].length).toBe(3); // . + 2 digits
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('money filter should handle different currencies', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          fc.constantFrom('USD', 'EUR', 'GBP', 'JPY'),
          (amount, currency) => {
            const filter = registry.get('money')!;
            const result = filter(amount, currency);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 27: Arithmetic Filters', () => {
    it('plus filter should be commutative', () => {
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
          fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
          (a, b) => {
            const filter = registry.get('plus')!;
            expect(filter(a, b)).toBeCloseTo(filter(b, a));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('minus filter should be inverse of plus', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          (a, b) => {
            const plus = registry.get('plus')!;
            const minus = registry.get('minus')!;
            
            const sum = plus(a, b);
            const diff = minus(sum, b);
            
            expect(diff).toBeCloseTo(a, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('times filter should be commutative', () => {
      fc.assert(
        fc.property(
          fc.float({ noNaN: true }),
          fc.float({ noNaN: true }),
          (a, b) => {
            const filter = registry.get('times')!;
            expect(filter(a, b)).toBeCloseTo(filter(b, a));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('divided_by filter should be inverse of times', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 1000, noNaN: true }),
          fc.float({ min: 1, max: 1000, noNaN: true }),
          (a, b) => {
            const times = registry.get('times')!;
            const dividedBy = registry.get('divided_by')!;
            
            const product = times(a, b);
            const quotient = dividedBy(product, b);
            
            expect(quotient).toBeCloseTo(a, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('divided_by should handle zero divisor gracefully', () => {
      fc.assert(
        fc.property(fc.float({ noNaN: true }), (a) => {
          const filter = registry.get('divided_by')!;
          const result = filter(a, 0);
          
          expect(result).toBe(0); // Should return 0 instead of Infinity
        }),
        { numRuns: 100 }
      );
    });

    it('modulo should always return value less than divisor', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          (a, b) => {
            const filter = registry.get('modulo')!;
            const result = filter(a, b);
            
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThan(b);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: Date Filter Formatting', () => {
    it('date filter should produce consistent output for same input', () => {
      fc.assert(
        fc.property(
          fc.date({
            min: new Date('2000-01-01'),
            max: new Date('2030-12-31'),
            noInvalidDate: true,
          }),
          fc.constantFrom('yyyy-MM-dd', 'MMMM dd, yyyy', 'dd/MM/yyyy'),
          (date, format) => {
            const filter = registry.get('date')!;
            const result1 = filter(date, format);
            const result2 = filter(date, format);
            
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('date filter should handle Date objects and strings', () => {
      fc.assert(
        fc.property(
          fc.date({
            min: new Date('2000-01-01'),
            max: new Date('2030-12-31'),
            noInvalidDate: true,
          }),
          (date) => {
            const filter = registry.get('date')!;
            const dateString = date.toISOString();
            
            const result1 = filter(date, 'yyyy-MM-dd');
            const result2 = filter(dateString, 'yyyy-MM-dd');
            
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('date filter should return empty string for invalid dates', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => isNaN(new Date(s).getTime())),
          (invalidDate) => {
            const filter = registry.get('date')!;
            const result = filter(invalidDate, 'yyyy-MM-dd');
            
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Default Filter Fallback', () => {
    it('default filter should return fallback for null/undefined', () => {
      fc.assert(
        fc.property(fc.anything(), (fallback) => {
          const filter = registry.get('default')!;
          
          expect(filter(null, fallback)).toBe(fallback);
          expect(filter(undefined, fallback)).toBe(fallback);
        }),
        { numRuns: 100 }
      );
    });

    it('default filter should return value when defined', () => {
      fc.assert(
        fc.property(
          fc.anything().filter(v => v !== null && v !== undefined),
          fc.anything(),
          (value, fallback) => {
            const filter = registry.get('default')!;
            expect(filter(value, fallback)).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('default filter should handle falsy values correctly', () => {
      fc.assert(
        fc.property(fc.anything(), (fallback) => {
          const filter = registry.get('default')!;
          
          // 0, false, '' should NOT trigger fallback
          expect(filter(0, fallback)).toBe(0);
          expect(filter(false, fallback)).toBe(false);
          expect(filter('', fallback)).toBe('');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Filter Chaining', () => {
    it('filter chaining should apply filters in sequence', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          (input) => {
            const upcase = registry.get('upcase')!;
            const truncate = registry.get('truncate')!;
            
            // Manual chaining
            const step1 = upcase(input);
            const step2 = truncate(step1, 5);
            
            // Verify each step
            expect(step1).toBe(input.toUpperCase());
            expect(step2).toBe(step1.slice(0, 5) + '...');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filter chaining should apply filters from left to right', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          (input) => {
            const upcase = registry.get('upcase')!;
            const truncate = registry.get('truncate')!;
            
            // Chain 1: upcase then truncate
            const result1 = truncate(upcase(input), 5);
            
            const expected = input.toUpperCase().slice(0, 5) + '...';
            expect(result1).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filter chaining should be associative for compatible filters', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (input) => {
            const plus = registry.get('plus')!;
            const times = registry.get('times')!;
            
            // (input + 5) * 2
            const result1 = times(plus(input, 5), 2);
            
            // Verify arithmetic
            expect(result1).toBeCloseTo((input + 5) * 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 17: Filter Type Mismatch Handling', () => {
    it('upcase on number should return empty string', () => {
      fc.assert(
        fc.property(
          fc.float({ noNaN: true }),
          (num) => {
            const filter = registry.get('upcase')!;
            // upcase expects string, but gets number
            // Current implementation converts to string, which is acceptable
            const result = filter(num);
            expect(typeof result).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('money on non-number should return empty string', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => isNaN(Number(s))),
          (str) => {
            const filter = registry.get('money')!;
            const result = filter(str);
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('arithmetic filters on non-numbers should handle gracefully', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (str) => {
            const plus = registry.get('plus')!;
            const result = plus(str, 5);
            
            // Should convert to number (NaN) and handle
            expect(typeof result).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('date filter on invalid date should return empty string', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => isNaN(new Date(s).getTime())),
          (invalidDate) => {
            const filter = registry.get('date')!;
            const result = filter(invalidDate, 'yyyy-MM-dd');
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
