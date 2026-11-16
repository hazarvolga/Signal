/**
 * Property-Based Tests for TemplateParser
 *
 * These tests validate universal properties that should hold for all inputs.
 */

import * as fc from "fast-check";
import { TemplateParser } from "../../../src/services/template/TemplateParser";

describe("TemplateParser - Property Tests", () => {
  let parser: TemplateParser;

  beforeEach(() => {
    parser = new TemplateParser();
  });

  /**
   * Property 1: Mixed Syntax Parsing
   *
   * For any template containing both legacy {{variable}} syntax and advanced {% tag %} syntax,
   * the template engine should successfully parse and render both syntax types correctly.
   *
   * Validates: Requirements 1.1
   */
  describe("Property 1: Mixed Syntax Parsing", () => {
    it("should parse templates with both legacy and advanced syntax", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)), // variable name
          fc.stringMatching(/^[a-zA-Z0-9 .,!?_-]{1,50}$/), // valid literal text content
          (varName, textContent) => {
            // Create a mixed syntax template
            const template = `Hello {{${varName}}} {% if ${varName} %}${textContent}{% endif %}`;

            // Should parse without throwing
            const ast = parser.parse(template);

            // Should return valid AST
            expect(ast.type).toBe("root");
            expect(ast.children).toBeDefined();
            expect(Array.isArray(ast.children)).toBe(true);

            // Should detect as mixed syntax
            const syntaxType = parser.detectSyntaxType(template);
            expect(syntaxType).toBe("mixed");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should correctly identify syntax type for any template", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Legacy only
            fc.string({ minLength: 1, maxLength: 20 }).map((s) => `{{${s}}}`),
            // Advanced only
            fc.string({ minLength: 1, maxLength: 20 }).map((s) => `{% if ${s} %}text{% endif %}`),
            // Mixed
            fc
              .tuple(
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 20 })
              )
              .map(([v1, v2]) => `{{${v1}}} {% if ${v2} %}text{% endif %}`)
          ),
          (template) => {
            const syntaxType = parser.detectSyntaxType(template);

            // Should return one of the valid types
            expect(["legacy", "advanced", "mixed"]).toContain(syntaxType);

            // Verify correctness
            const hasLegacy = /\{\{[^}]+\}\}/.test(template);
            const hasAdvanced = /\{%[^}]+%\}/.test(template);

            if (hasLegacy && hasAdvanced) {
              expect(syntaxType).toBe("mixed");
            } else if (hasAdvanced) {
              expect(syntaxType).toBe("advanced");
            } else if (hasLegacy) {
              expect(syntaxType).toBe("legacy");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Variable Interpolation
   *
   * For any variable name and context data containing that variable,
   * rendering {{variable}} should replace it with the corresponding value from the context.
   *
   * Validates: Requirements 1.2
   */
  describe("Property 2: Variable Interpolation", () => {
    it("should extract all variables from template", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
            { minLength: 1, maxLength: 10 }
          ),
          (varNames) => {
            // Create template with all variables
            const template = varNames.map((v) => `{{${v}}}`).join(" ");

            // Extract variables
            const extracted = parser.extractVariables(template);

            // All variables should be extracted
            varNames.forEach((varName) => {
              expect(extracted).toContain(varName);
            });

            // No extra variables should be extracted
            expect(extracted.length).toBe(new Set(varNames).size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should extract root variable from nested properties", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc.array(
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
            { minLength: 1, maxLength: 5 }
          ),
          (rootVar, properties) => {
            // Create nested property access
            const propertyPath = [rootVar, ...properties].join(".");
            const template = `{{${propertyPath}}}`;

            // Extract variables
            const extracted = parser.extractVariables(template);

            // Should extract only root variable
            expect(extracted).toContain(rootVar);
            expect(extracted.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should deduplicate repeated variables", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc.integer({ min: 2, max: 10 }),
          (varName, repeatCount) => {
            // Create template with repeated variable
            const template = Array(repeatCount).fill(`{{${varName}}}`).join(" ");

            // Extract variables
            const extracted = parser.extractVariables(template);

            // Should extract variable only once
            expect(extracted.length).toBe(1);
            expect(extracted[0]).toBe(varName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 30: Pretty Print Round Trip
   *
   * For any valid template, parsing then pretty printing then parsing again
   * should produce an equivalent AST (structure-preserving round trip).
   *
   * Validates: Requirements 7.4
   */
  describe("Property 30: Pretty Print Round Trip", () => {
    it("should preserve AST structure through pretty print round trip", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Simple variable templates
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
              .map((s) => `{{${s}}}`),
            // Conditional templates
            fc
              .tuple(
                fc
                  .string({ minLength: 1, maxLength: 20 })
                  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
                fc.string({ minLength: 1, maxLength: 50 })
              )
              .map(([cond, content]) => `{% if ${cond} %}${content}{% endif %}`),
            // Loop templates
            fc
              .tuple(
                fc
                  .string({ minLength: 1, maxLength: 20 })
                  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
                fc
                  .string({ minLength: 1, maxLength: 20 })
                  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
              )
              .map(
                ([item, collection]) => `{% for ${item} in ${collection} %}{{${item}}}{% endfor %}`
              )
          ),
          (template) => {
            try {
              // Parse original template
              const ast1 = parser.parse(template);

              // Pretty print
              const prettyTemplate = parser.prettyPrint(template);

              // Parse pretty printed template
              const ast2 = parser.parse(prettyTemplate);

              // ASTs should have same structure
              expect(ast1.type).toBe(ast2.type);
              expect(ast1.children.length).toBe(ast2.children.length);
            } catch (error) {
              // If template is invalid, both parses should fail
              expect(() => parser.parse(template)).toThrow();
            }
          }
        ),
        { numRuns: 50 } // Fewer runs for complex property
      );
    });
  });

  /**
   * Property 31: Whitespace Normalization
   *
   * For any template with varying whitespace around tags,
   * pretty printing should normalize whitespace consistently.
   *
   * Validates: Requirements 7.2
   */
  describe("Property 31: Whitespace Normalization", () => {
    it("should normalize whitespace around template tags", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (varName, leftSpaces, rightSpaces) => {
            // Create template with varying whitespace
            const template = `{{${" ".repeat(leftSpaces)}${varName}${" ".repeat(rightSpaces)}}}`;

            // Pretty print
            const pretty = parser.prettyPrint(template);

            // Should normalize to single space
            expect(pretty).toBe(`{{ ${varName} }}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should normalize whitespace around tag syntax", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (varName, leftSpaces, rightSpaces) => {
            // Create template with varying whitespace
            const template = `{%${" ".repeat(leftSpaces)}if ${varName}${" ".repeat(rightSpaces)}%}text{% endif %}`;

            // Pretty print
            const pretty = parser.prettyPrint(template);

            // Should normalize to single space
            expect(pretty).toContain("{% if");
            expect(pretty).toContain(" %}");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 32: Indentation Preservation
   *
   * For any template with nested blocks,
   * pretty printing should maintain proper indentation that reflects the nesting structure.
   *
   * Validates: Requirements 7.3
   */
  describe("Property 32: Indentation Preservation", () => {
    it("should indent nested blocks correctly", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length > 0 && !/[{}%\r\n]/.test(s)),
          (varName, content) => {
            // Create nested template
            const template = `{% if ${varName} %}\n${content}\n{% endif %}`;

            // Pretty print
            const pretty = parser.prettyPrint(template);

            // Should have proper indentation
            const lines = pretty.split("\n");

            // First line (if) should have no indent
            expect(lines[0].startsWith("{% if")).toBe(true);

            // Content line should be indented
            if (lines.length > 1 && lines[1].trim().length > 0) {
              expect(lines[1].startsWith("  ")).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle multiple nesting levels", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          (var1, var2) => {
            // Create doubly nested template
            const template = `{% if ${var1} %}\n{% if ${var2} %}\ntext\n{% endif %}\n{% endif %}`;

            // Pretty print
            const pretty = parser.prettyPrint(template);

            // Should have proper indentation levels
            const lines = pretty.split("\n");

            // Outer if should have no indent
            expect(lines[0].startsWith("{% if")).toBe(true);

            // Inner if should have 2 spaces
            if (lines.length > 1) {
              const innerIfLine = lines.find((l) => l.includes("{% if") && l !== lines[0]);
              if (innerIfLine) {
                expect(innerIfLine.startsWith("  ")).toBe(true);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
