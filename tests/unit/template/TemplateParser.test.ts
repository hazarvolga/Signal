/**
 * Unit Tests for TemplateParser
 */

import { TemplateParser } from '../../../src/services/template/TemplateParser';

describe('TemplateParser', () => {
  let parser: TemplateParser;

  beforeEach(() => {
    parser = new TemplateParser();
  });

  describe('parse()', () => {
    it('should parse simple variable template', () => {
      const template = 'Hello {{name}}';
      const ast = parser.parse(template);
      
      expect(ast.type).toBe('root');
      expect(ast.children).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should parse template with conditionals', () => {
      const template = '{% if user.isPremium %}Premium{% else %}Regular{% endif %}';
      const ast = parser.parse(template);
      
      expect(ast.type).toBe('root');
      expect(ast.children).toBeDefined();
    });

    it('should parse template with loops', () => {
      const template = '{% for product in products %}{{product.name}}{% endfor %}';
      const ast = parser.parse(template);
      
      expect(ast.type).toBe('root');
      expect(ast.children).toBeDefined();
    });

    it('should throw error for invalid syntax', () => {
      const template = '{% if condition %}no endif';
      
      expect(() => parser.parse(template)).toThrow();
    });
  });

  describe('detectSyntaxType()', () => {
    it('should detect legacy syntax', () => {
      const template = 'Hello {{name}}, your score is {{score}}';
      expect(parser.detectSyntaxType(template)).toBe('legacy');
    });

    it('should detect advanced syntax', () => {
      const template = '{% if user.isPremium %}Premium{% endif %}';
      expect(parser.detectSyntaxType(template)).toBe('advanced');
    });

    it('should detect mixed syntax', () => {
      const template = 'Hello {{name}} {% if isPremium %}Premium{% endif %}';
      expect(parser.detectSyntaxType(template)).toBe('mixed');
    });

    it('should default to legacy for plain text', () => {
      const template = 'Hello world';
      expect(parser.detectSyntaxType(template)).toBe('legacy');
    });
  });

  describe('extractVariables()', () => {
    it('should extract simple variables', () => {
      const template = 'Hello {{name}}, your score is {{score}}';
      const variables = parser.extractVariables(template);
      
      expect(variables).toContain('name');
      expect(variables).toContain('score');
      expect(variables.length).toBe(2);
    });

    it('should extract nested property variables', () => {
      const template = 'Hello {{user.firstName}} {{user.lastName}}';
      const variables = parser.extractVariables(template);
      
      expect(variables).toContain('user');
      expect(variables.length).toBe(1); // Only root variable
    });

    it('should extract variables from conditionals', () => {
      const template = '{% if user.isPremium %}Premium{% endif %}';
      const variables = parser.extractVariables(template);
      
      expect(variables).toContain('user');
    });

    it('should extract variables from loops', () => {
      const template = '{% for product in products %}{{product.name}}{% endfor %}';
      const variables = parser.extractVariables(template);
      
      expect(variables).toContain('products');
      expect(variables).toContain('product');
    });

    it('should not extract keywords as variables', () => {
      const template = '{% if condition and other or third %}text{% endif %}';
      const variables = parser.extractVariables(template);
      
      expect(variables).not.toContain('if');
      expect(variables).not.toContain('and');
      expect(variables).not.toContain('or');
    });

    it('should handle templates with no variables', () => {
      const template = 'Hello world';
      const variables = parser.extractVariables(template);
      
      expect(variables.length).toBe(0);
    });

    it('should deduplicate variables', () => {
      const template = '{{name}} {{name}} {{name}}';
      const variables = parser.extractVariables(template);
      
      expect(variables.length).toBe(1);
      expect(variables[0]).toBe('name');
    });
  });
});
