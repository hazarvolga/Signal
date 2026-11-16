/**
 * Property-based tests for Error Handling
 * 
 * Tests universal correctness properties for error categorization and reporting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { TemplateEngine } from '../../../src/services/template/TemplateEngine';
import { ErrorHandler } from '../../../src/services/template/ErrorHandler';

describe('Error Handling - Property Tests', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  /**
   * Property 28: Syntax Error Messages
   * 
   * For any template with syntax errors, the validator should return error objects
   * containing descriptive error messages.
   * 
   * Validates: Requirements 6.3, 14.2
   */
  describe('Property 28: Syntax Error Messages', () => {
    it('should return descriptive error messages for syntax errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Unclosed if tag
            fc.string({ minLength: 1, maxLength: 20 })
              .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
              .map(s => `{% if ${s} %}content`),
            // Unclosed for tag
            fc.string({ minLength: 1, maxLength: 20 })
              .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
              .map(s => `{% for item in ${s} %}content`),
            // Invalid tag name
            fc.string({ minLength: 1, maxLength: 20 })
              .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
              .map(s => `{% invalidtag ${s} %}`)
          ),
          (template) => {
            const result = engine.validate(template);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            
            // Should have errors
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
            
            // Error should have a message
            const error = result.errors![0];
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
            
            // Error should be categorized as SYNTAX_ERROR
            expect(error.type).toBe('SYNTAX_ERROR');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 35: Error Object Structure
   * 
   * For any template rendering error, the error object should contain
   * line number, column number (if applicable), and a descriptive error message.
   * 
   * Validates: Requirements 8.6, 14.1
   */
  describe('Property 35: Error Object Structure', () => {
    it('should include message in error object', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (errorMsg) => {
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should have message
            expect(error.message).toBeDefined();
            expect(error.message).toBe(errorMsg);
            
            // Should have type
            expect(error.type).toBeDefined();
            expect(['SYNTAX_ERROR', 'RUNTIME_ERROR', 'TIMEOUT_ERROR', 'SECURITY_ERROR']).toContain(error.type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract line and column from error messages', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          (line, column) => {
            const errorMsg = `Template error at line ${line}, column ${column}`;
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should extract line number
            expect(error.line).toBe(line);
            
            // Should extract column number
            expect(error.column).toBe(column);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 36: Error Context Information
   * 
   * For any runtime error, the error object should include context information
   * about which variable or filter caused the error.
   * 
   * Validates: Requirements 14.3
   */
  describe('Property 36: Error Context Information', () => {
    it('should extract variable name from error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          (varName) => {
            const errorMsg = `Variable "${varName}" is undefined`;
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should extract variable name
            expect(error.context).toBeDefined();
            expect(error.context!.variable).toBe(varName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract filter name from error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          (filterName) => {
            const errorMsg = `Filter "${filterName}" not found`;
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should extract filter name
            expect(error.context).toBeDefined();
            expect(error.context!.filter).toBe(filterName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract tag name from error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          (tagName) => {
            const errorMsg = `Tag "${tagName}" is invalid`;
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should extract tag name
            expect(error.context).toBeDefined();
            expect(error.context!.tag).toBe(tagName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 37: Error Categorization
   * 
   * For any error, the template engine should categorize it as one of:
   * SYNTAX_ERROR, RUNTIME_ERROR, TIMEOUT_ERROR, or SECURITY_ERROR.
   * 
   * Validates: Requirements 14.4
   */
  describe('Property 37: Error Categorization', () => {
    it('should categorize timeout errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'TIMEOUT_ERROR: execution exceeded',
            'timeout occurred',
            'exceeded time limit'
          ),
          (errorMsg) => {
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            expect(error.type).toBe('TIMEOUT_ERROR');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should categorize security errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'SECURITY_ERROR: forbidden operation',
            'not allowed',
            'forbidden access'
          ),
          (errorMsg) => {
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            expect(error.type).toBe('SECURITY_ERROR');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should categorize syntax errors correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'parsing failed',
            'unexpected token',
            'unclosed tag',
            'syntax error'
          ),
          (errorMsg) => {
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            expect(error.type).toBe('SYNTAX_ERROR');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should default to runtime error for unknown errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => !s.includes('timeout') && !s.includes('SECURITY') && !s.includes('parsing')),
          (errorMsg) => {
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should default to RUNTIME_ERROR
            expect(error.type).toBe('RUNTIME_ERROR');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 38: Error Suggestions
   * 
   * For any common syntax mistake, the error handler should provide
   * helpful suggestions for correction.
   * 
   * Validates: Requirements 14.5
   */
  describe('Property 38: Error Suggestions', () => {
    it('should suggest closing tags for unclosed blocks', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('if', 'for', 'unless', 'capture'),
          (tagName) => {
            const errorMsg = `unclosed ${tagName} tag`;
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should have a suggestion
            expect(error.suggestion).toBeDefined();
            expect(error.suggestion!.length).toBeGreaterThan(0);
            
            // Suggestion should mention the closing tag
            expect(error.suggestion!.toLowerCase()).toContain(`end${tagName}`);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should suggest checking variable existence for undefined errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('undefined', 'not found'),
          (errorType) => {
            const errorMsg = `variable is ${errorType}`;
            const error = ErrorHandler.createError(new Error(errorMsg));
            
            // Should have a suggestion
            expect(error.suggestion).toBeDefined();
            expect(error.suggestion!.length).toBeGreaterThan(0);
            
            // Suggestion should mention checking variable or using default filter
            const suggestion = error.suggestion!.toLowerCase();
            expect(
              suggestion.includes('variable') || 
              suggestion.includes('default')
            ).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should suggest simplifying for timeout errors', () => {
      const errorMsg = 'TIMEOUT_ERROR: execution exceeded time limit';
      const error = ErrorHandler.createError(new Error(errorMsg));
      
      // Should have a suggestion
      expect(error.suggestion).toBeDefined();
      expect(error.suggestion!.length).toBeGreaterThan(0);
      
      // Suggestion should mention simplifying or checking loops
      const suggestion = error.suggestion!.toLowerCase();
      expect(
        suggestion.includes('loop') || 
        suggestion.includes('simplif')
      ).toBe(true);
    });

    it('should explain security restrictions for security errors', () => {
      const errorMsg = 'SECURITY_ERROR: forbidden operation';
      const error = ErrorHandler.createError(new Error(errorMsg));
      
      // Should have a suggestion
      expect(error.suggestion).toBeDefined();
      expect(error.suggestion!.length).toBeGreaterThan(0);
      
      // Suggestion should mention security
      const suggestion = error.suggestion!.toLowerCase();
      expect(suggestion.includes('security')).toBe(true);
    });
  });

  /**
   * Additional test: Error formatting
   */
  describe('Error Formatting', () => {
    it('should format errors in a readable way', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (errorMsg) => {
            const error = ErrorHandler.createError(new Error(errorMsg));
            const formatted = ErrorHandler.formatError(error);
            
            // Should include error type
            expect(formatted).toContain(error.type);
            
            // Should include message
            expect(formatted).toContain(error.message);
            
            // Should be non-empty
            expect(formatted.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

