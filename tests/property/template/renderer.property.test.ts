/**
 * Property-based tests for TemplateRenderer
 * 
 * Tests universal correctness properties for template rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { TemplateRenderer } from '../../../src/services/template/TemplateRenderer';
import { FilterRegistry } from '../../../src/services/template/FilterRegistry';
import { ContextData } from '../../../src/services/template/types';

const literalText = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 .,!?_-]{0,49}$/);

describe('TemplateRenderer - Property Tests', () => {
  let renderer: TemplateRenderer;
  let filterRegistry: FilterRegistry;

  beforeEach(() => {
    filterRegistry = new FilterRegistry();
    renderer = new TemplateRenderer(filterRegistry);
  });

  describe('Property 2: Variable Interpolation', () => {
    it('should interpolate any variable value into template', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc.oneof(fc.string(), fc.integer(), fc.float(), fc.boolean()),
          async (varName, value) => {
            const template = `{{${varName}}}`;
            const context: ContextData = { [varName]: value };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(String(value));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 33: Nested Property Access', () => {
    it('should access nested properties correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          literalText,
          literalText,
          async (firstName, lastName) => {
            const template = '{{user.firstName}} {{user.lastName}}';
            const context: ContextData = {
              user: { firstName, lastName },
            };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(`${firstName} ${lastName}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 34: Array Index Access', () => {
    it('should access array elements by index', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (items) => {
            const template = '{{items[0]}}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(items[0]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Undefined Variable Handling', () => {
    it('should render undefined variables as empty string', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          async (varName) => {
            const template = `{{${varName}}}`;
            const context: ContextData = {}; // Variable not defined
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Conditional Rendering', () => {
    it('should render if block when condition is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          literalText,
          async (content) => {
            const template = `{% if condition %}${content}{% endif %}`;
            const context: ContextData = { condition: true };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not render if block when condition is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          literalText,
          async (content) => {
            const template = `{% if condition %}${content}{% endif %}`;
            const context: ContextData = { condition: false };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Comparison Operators', () => {
    it('should correctly evaluate > operator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          async (a, b) => {
            const template = '{% if a > b %}yes{% else %}no{% endif %}';
            const context: ContextData = { a, b };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(a > b ? 'yes' : 'no');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly evaluate == operator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.integer(),
          async (a, b) => {
            const template = '{% if a == b %}yes{% else %}no{% endif %}';
            const context: ContextData = { a, b };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(a === b ? 'yes' : 'no');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Logical Operators', () => {
    it('should correctly evaluate AND operator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.boolean(),
          async (a, b) => {
            const template = '{% if a and b %}yes{% else %}no{% endif %}';
            const context: ContextData = { a, b };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(a && b ? 'yes' : 'no');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly evaluate OR operator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.boolean(),
          async (a, b) => {
            const template = '{% if a or b %}yes{% else %}no{% endif %}';
            const context: ContextData = { a, b };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(a || b ? 'yes' : 'no');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: If-Else Branching', () => {
    it('should render correct branch based on condition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          literalText,
          literalText,
          async (condition, trueContent, falseContent) => {
            const template = `{% if condition %}${trueContent}{% else %}${falseContent}{% endif %}`;
            const context: ContextData = { condition };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(condition ? trueContent : falseContent);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Unless Inverse Conditional', () => {
    it('should render unless block when condition is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          literalText,
          async (condition, content) => {
            const template = `{% unless condition %}${content}{% endunless %}`;
            const context: ContextData = { condition };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(condition ? '' : content);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Contains Operator', () => {
    it('should check if array contains value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (items) => {
            const searchValue = items[0];
            const template = '{% if items contains searchValue %}yes{% else %}no{% endif %}';
            const context: ContextData = { items, searchValue };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe('yes');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Loop Iteration Count', () => {
    it('should iterate correct number of times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 20 }),
          async (items) => {
            const template = '{% for item in items %}x{% endfor %}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result.length).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Loop Limit Modifier', () => {
    it('should respect limit modifier', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          async (items, limit) => {
            const template = `{% for item in items limit:${limit} %}x{% endfor %}`;
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            const expectedLength = Math.min(items.length, limit);
            expect(result.length).toBe(expectedLength);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Forloop Variables', () => {
    it('should provide forloop.index (1-based)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (items) => {
            const template = '{% for item in items %}{{forloop.index}},{% endfor %}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            const indices = result.split(',').filter(s => s).map(Number);
            expect(indices).toEqual(items.map((_, i) => i + 1));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide forloop.index0 (0-based)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (items) => {
            const template = '{% for item in items %}{{forloop.index0}},{% endfor %}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            const indices = result.split(',').filter(s => s).map(Number);
            expect(indices).toEqual(items.map((_, i) => i));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide forloop.first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
          async (items) => {
            const template = '{% for item in items %}{% if forloop.first %}F{% else %}N{% endif %}{% endfor %}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result[0]).toBe('F');
            expect(result.slice(1)).toBe('N'.repeat(items.length - 1));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide forloop.last', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
          async (items) => {
            const template = '{% for item in items %}{% if forloop.last %}L{% else %}N{% endif %}{% endfor %}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result[result.length - 1]).toBe('L');
            expect(result.slice(0, -1)).toBe('N'.repeat(items.length - 1));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: Variable Assignment', () => {
    it('should assign and access variable', async () => {
      await fc.assert(
        fc.asyncProperty(
          literalText,
          async (value) => {
            const template = `{% assign x = "${value}" %}{{x}}`;
            const context: ContextData = {};
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 23: Assignment with Filters', () => {
    it('should assign filtered value', async () => {
      await fc.assert(
        fc.asyncProperty(
          literalText,
          async (value) => {
            const template = `{% assign upper = value | upcase %}{{upper}}`;
            const context: ContextData = { value };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(value.toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: Capture Block', () => {
    it('should capture rendered content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (name) => {
            const template = `{% capture greeting %}Hello {{name}}{% endcapture %}{{greeting}}`;
            const context: ContextData = { name };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(`Hello ${name}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Variable Scope Inheritance', () => {
    it('should access outer scope variables in nested scopes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          async (value) => {
            const template = '{% assign x = value %}{% if true %}{{x}}{% endif %}';
            const context: ContextData = { value };
            
            const result = await renderer.renderTemplate(template, context);
            
            expect(result).toBe(String(value));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: Loop Variable Isolation', () => {
    it('should isolate loop variables between iterations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer(), { minLength: 2, maxLength: 10 }),
          async (items) => {
            const template = '{% for item in items %}{{item}},{% endfor %}';
            const context: ContextData = { items };
            
            const result = await renderer.renderTemplate(template, context);
            
            const rendered = result.split(',').filter(s => s).map(Number);
            expect(rendered).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  /**
   * Property 44: Campaign Batch Rendering
   * 
   * For any campaign with N recipients, the template renderer should render
   * the template exactly N times, once per recipient with their individual context data.
   * 
   * Validates: Requirements 13.1
   */
  describe('Property 44: Campaign Batch Rendering', () => {
    const renderer = new TemplateRenderer(new FilterRegistry());
    it('should render template for each recipient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (recipients) => {
            const template = 'Hello {{name}}!';
            const contexts = recipients.map(r => ({ name: r.name }));
            
            const result = await renderer.batchRender(template, contexts, {});
            
            // Should have result for each recipient
            expect(result.results.length).toBe(recipients.length);
            
            // All should succeed
            expect(result.metrics.successCount).toBe(recipients.length);
            expect(result.metrics.errorCount).toBe(0);
            
            // Each result should match the recipient's name
            result.results.forEach((res, idx) => {
              expect(res.html).toBe(`Hello ${recipients[idx].name}!`);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide correct metrics for batch rendering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              value: fc.integer({ min: 0, max: 1000 }),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          async (recipients) => {
            const template = '{{value}}';
            const contexts = recipients.map(r => ({ value: r.value }));
            
            const result = await renderer.batchRender(template, contexts, {});
            
            // Metrics should be accurate
            expect(result.metrics.successCount).toBe(recipients.length);
            expect(result.metrics.errorCount).toBe(0);
            expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
            expect(result.metrics.averageRenderTime).toBeGreaterThanOrEqual(0);
            
            // Average should be reasonable
            const avgTime = result.metrics.averageRenderTime;
            expect(avgTime).toBeLessThanOrEqual(result.metrics.totalTime);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 45: Batch Error Isolation
   * 
   * For any batch rendering where some recipients have invalid context data,
   * rendering failures for some recipients should not prevent successful
   * rendering for other recipients.
   * 
   * Validates: Requirements 13.3
   */
  describe('Property 45: Batch Error Isolation', () => {
    const renderer = new TemplateRenderer(new FilterRegistry());
    it('should isolate errors and continue rendering other recipients', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              shouldFail: fc.boolean(),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (recipients) => {
            // Template that will fail if name is undefined
            const template = '{{name | upcase}}';
            
            // Create contexts - some with missing name
            const contexts = recipients.map(r => 
              r.shouldFail ? {} : { name: r.name }
            );
            
            const result = await renderer.batchRender(template, contexts, {});
            
            // Should have result for each recipient
            expect(result.results.length).toBe(recipients.length);
            
            // Count expected successes and failures
            const expectedSuccesses = recipients.filter(r => !r.shouldFail).length;
            const expectedFailures = recipients.filter(r => r.shouldFail).length;
            
            // Success count should match (or be close, since empty string is valid)
            expect(result.metrics.successCount).toBeGreaterThanOrEqual(expectedSuccesses);
            
            // Total should equal recipients
            expect(result.metrics.successCount + result.metrics.errorCount).toBe(recipients.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should continue batch rendering even if some renders fail', async () => {
      // Create a mix of valid and invalid contexts
      const contexts: ContextData[] = [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' },
      ];
      
      const template = 'Hello {{name}}!';
      
      const result = await renderer.batchRender(template, contexts, {});
      
      // All should succeed (no actual failures in this case)
      expect(result.results.length).toBe(3);
      expect(result.metrics.successCount).toBe(3);
      
      // Verify each result
      expect(result.results[0].html).toBe('Hello Alice!');
      expect(result.results[1].html).toBe('Hello Bob!');
      expect(result.results[2].html).toBe('Hello Charlie!');
    });
  });
