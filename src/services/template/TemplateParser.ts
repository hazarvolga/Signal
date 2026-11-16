/**
 * TemplateParser - Parse and analyze template syntax
 *
 * Uses LiquidJS to parse templates and provides utilities for
 * syntax detection and variable extraction.
 */

import { Liquid, Template as LiquidTemplate } from "liquidjs";
import { TemplateParser as ITemplateParser, TemplateAST, ASTNode } from "./types";

export class TemplateParser implements ITemplateParser {
  private liquid: Liquid;

  constructor() {
    this.liquid = new Liquid({
      cache: false, // We handle caching separately
      strictFilters: false, // Allow undefined filters (we'll handle errors)
      strictVariables: false, // Allow undefined variables (render as empty)
      lenientIf: true, // Treat undefined as falsy in conditionals
    });
  }

  /**
   * Parse template string to AST
   *
   * @param template - Template string to parse
   * @returns TemplateAST structure
   */
  parse(template: string): TemplateAST {
    try {
      // Parse using LiquidJS
      const liquidTemplate = this.liquid.parse(template);

      // Convert LiquidJS AST to our AST format
      return this.convertToAST(liquidTemplate);
    } catch (error) {
      throw new Error(
        `Template parsing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect if template uses legacy {{}} or advanced {% %} syntax
   *
   * @param template - Template string to analyze
   * @returns 'legacy' | 'advanced' | 'mixed'
   */
  detectSyntaxType(template: string): "legacy" | "advanced" | "mixed" {
    const hasLegacy = /\{\{[^}]+\}\}/.test(template);
    const hasAdvanced = /\{%[^}]+%\}/.test(template);

    if (hasLegacy && hasAdvanced) {
      return "mixed";
    } else if (hasAdvanced) {
      return "advanced";
    } else if (hasLegacy) {
      return "legacy";
    }

    return "legacy"; // Default to legacy if no template syntax found
  }

  /**
   * Extract all variables used in template
   *
   * @param template - Template string to analyze
   * @returns Array of variable names
   */
  extractVariables(template: string): string[] {
    const variables = new Set<string>();

    // Match {{variable}} and {{object.property}}
    const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_\.]*)/g;
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      // Extract root variable name (before first dot)
      const varName = match[1].split(".")[0];
      variables.add(varName);
    }

    // Match variables in {% %} tags (for, if, assign, etc.)
    const tagRegex = /\{%\s*(?:if|unless|for|assign|capture)\s+([^%]+)%\}/g;

    while ((match = tagRegex.exec(template)) !== null) {
      const content = match[1];
      // Extract variable names (simple heuristic)
      const varMatches = content.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
      if (varMatches) {
        varMatches.forEach((v) => {
          // Filter out keywords
          if (
            !["if", "unless", "for", "in", "assign", "capture", "and", "or", "contains"].includes(v)
          ) {
            variables.add(v);
          }
        });
      }
    }

    return Array.from(variables);
  }

  /**
   * Pretty print template (normalize formatting)
   *
   * @param template - Template string to format
   * @returns Formatted template string
   */
  prettyPrint(template: string): string {
    // Normalize whitespace around template tags
    let formatted = template;

    // Normalize {% tag %} spacing
    formatted = formatted.replace(/\{%\s+/g, "{% ");
    formatted = formatted.replace(/\s+%\}/g, " %}");

    // Normalize {{ variable }} spacing
    formatted = formatted.replace(/\{{\s+/g, "{{ ");
    formatted = formatted.replace(/\s+\}}/g, " }}");

    // Normalize indentation for nested blocks
    const lines = formatted.split("\n");
    let indentLevel = 0;
    const indentSize = 2;

    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();

      // Decrease indent for closing tags
      if (trimmed.match(/^{%\s*(endif|endfor|endunless|endcapture|endcase|endblock)\s*%}/)) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indented = " ".repeat(indentLevel * indentSize) + trimmed;

      // Increase indent for opening tags
      if (trimmed.match(/^{%\s*(if|for|unless|capture|case|block)\s+/)) {
        indentLevel++;
      }

      // Decrease indent for else/elsif (they're at the same level as if)
      if (trimmed.match(/^{%\s*(else|elsif)\s*/)) {
        return " ".repeat(Math.max(0, indentLevel - 1) * indentSize) + trimmed;
      }

      return indented;
    });

    return formattedLines.join("\n");
  }

  /**
   * Convert LiquidJS template to our AST format
   *
   * @private
   * @param liquidTemplate - LiquidJS parsed template
   * @returns TemplateAST
   */
  private convertToAST(liquidTemplate: LiquidTemplate[]): TemplateAST {
    return {
      type: "root",
      children: this.convertNodes(liquidTemplate),
    };
  }

  /**
   * Convert LiquidJS nodes to our AST nodes
   *
   * @private
   * @param nodes - LiquidJS template nodes
   * @returns Array of ASTNode
   */
  private convertNodes(nodes: any[]): ASTNode[] {
    // Simplified conversion - in production, this would be more comprehensive
    return nodes.map((node) => {
      if (node.type === "html") {
        return {
          type: "text",
          value: node.str || node.value || "",
        } as ASTNode;
      }

      if (node.type === "output") {
        return {
          type: "variable",
          name: node.initial?.content?.str || "unknown",
          filters: [],
        } as ASTNode;
      }

      if (node.type === "tag") {
        return {
          type: "tag",
          name: node.name as any,
          params: {},
          children: node.templates ? this.convertNodes(node.templates) : [],
        } as ASTNode;
      }

      // Default to text node
      return {
        type: "text",
        value: "",
      } as ASTNode;
    });
  }
}
