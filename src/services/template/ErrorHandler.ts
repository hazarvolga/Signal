/**
 * ErrorHandler - Categorize and enhance template errors
 *
 * Provides helpful error messages and suggestions for common mistakes.
 */

import { TemplateError, TemplateErrorType } from "./types";

export class ErrorHandler {
  /**
   * Create a template error with categorization and suggestions
   *
   * @param error - Original error
   * @param template - Template string (for context)
   * @returns Enhanced template error
   */
  static createError(error: Error | string, template?: string): TemplateError {
    const message = error instanceof Error ? error.message : String(error);

    // Categorize error
    const type = this.categorizeError(message);

    // Extract line and column if available
    const { line, column } = this.extractLocation(message);

    // Generate helpful suggestion
    const suggestion = this.generateSuggestion(message, type);

    // Extract context information
    const context = this.extractContext(message, template);

    return {
      type,
      message,
      line,
      column,
      context,
      suggestion,
    };
  }

  /**
   * Categorize error type based on message
   *
   * @private
   * @param message - Error message
   * @returns Error type
   */
  private static categorizeError(message: string): TemplateErrorType {
    // Timeout errors
    if (
      message.includes("TIMEOUT_ERROR") ||
      message.includes("timeout") ||
      message.includes("exceeded time limit")
    ) {
      return "TIMEOUT_ERROR";
    }

    // Security errors
    if (
      message.includes("SECURITY_ERROR") ||
      message.includes("forbidden") ||
      message.includes("not allowed")
    ) {
      return "SECURITY_ERROR";
    }

    // Syntax errors
    if (
      message.includes("parsing failed") ||
      message.includes("unexpected token") ||
      message.includes("unclosed") ||
      message.includes("syntax error") ||
      message.includes("invalid syntax")
    ) {
      return "SYNTAX_ERROR";
    }

    // Default to runtime error
    return "RUNTIME_ERROR";
  }

  /**
   * Extract line and column from error message
   *
   * @private
   * @param message - Error message
   * @returns Line and column numbers
   */
  private static extractLocation(message: string): { line?: number; column?: number } {
    // Try to extract line:column pattern
    const lineColMatch = message.match(/line[:\s]+(\d+)[,\s]+column[:\s]+(\d+)/i);
    if (lineColMatch) {
      return {
        line: parseInt(lineColMatch[1], 10),
        column: parseInt(lineColMatch[2], 10),
      };
    }

    // Try to extract just line number
    const lineMatch = message.match(/line[:\s]+(\d+)/i);
    if (lineMatch) {
      return {
        line: parseInt(lineMatch[1], 10),
      };
    }

    return {};
  }

  /**
   * Generate helpful suggestion based on error
   *
   * @private
   * @param message - Error message
   * @param type - Error type
   * @returns Suggestion string
   */
  private static generateSuggestion(message: string, type: TemplateErrorType): string | undefined {
    // Syntax error suggestions
    if (type === "SYNTAX_ERROR") {
      if (message.includes("unclosed") || message.includes("missing")) {
        if (message.includes("if")) {
          return "Did you forget to add {% endif %} to close the if block?";
        }
        if (message.includes("for")) {
          return "Did you forget to add {% endfor %} to close the for loop?";
        }
        if (message.includes("unless")) {
          return "Did you forget to add {% endunless %} to close the unless block?";
        }
        if (message.includes("capture")) {
          return "Did you forget to add {% endcapture %} to close the capture block?";
        }
        return "Make sure all opening tags have corresponding closing tags.";
      }

      if (message.includes("unexpected token")) {
        return "Check for typos in tag names or filter names. Common tags: if, for, assign, capture.";
      }

      if (message.includes("invalid filter")) {
        return "Check the filter name spelling. Available filters: upcase, downcase, money, date, default, truncate, etc.";
      }
    }

    // Runtime error suggestions
    if (type === "RUNTIME_ERROR") {
      if (message.includes("undefined") || message.includes("not found")) {
        return "Make sure the variable exists in your context data. Use the | default filter to provide fallback values.";
      }

      if (message.includes("type") || message.includes("mismatch")) {
        return "Check that you're using the correct filter for the data type (e.g., money filter requires a number).";
      }

      if (message.includes("division by zero") || message.includes("divided_by")) {
        return "Avoid dividing by zero. Check your divisor value.";
      }

      if (message.includes("Loop iteration limit")) {
        return "Your loop is iterating too many times. Consider using the limit modifier: {% for item in collection limit:100 %}";
      }
    }

    // Timeout error suggestions
    if (type === "TIMEOUT_ERROR") {
      return "Template execution took too long. Check for infinite loops or excessive computation. Consider simplifying your template.";
    }

    // Security error suggestions
    if (type === "SECURITY_ERROR") {
      return "This operation is not allowed for security reasons. Templates cannot access system functions or execute arbitrary code.";
    }

    return undefined;
  }

  /**
   * Extract context information from error
   *
   * @private
   * @param message - Error message
   * @param template - Template string
   * @returns Context object
   */
  private static extractContext(
    message: string,
    template?: string
  ): { variable?: string; filter?: string; tag?: string; snippet?: string } | undefined {
    const context: { variable?: string; filter?: string; tag?: string; snippet?: string } = {};

    // Extract variable name
    const varMatch = message.match(/variable[:\s]+['"]?([a-zA-Z_][a-zA-Z0-9_.]*)['"]?/i);
    if (varMatch) {
      context.variable = varMatch[1];
    }

    // Extract filter name
    const filterMatch = message.match(/filter[:\s]+['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/i);
    if (filterMatch) {
      context.filter = filterMatch[1];
    }

    // Extract tag name
    const tagMatch = message.match(/tag[:\s]+['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/i);
    if (tagMatch) {
      context.tag = tagMatch[1];
    }

    // Extract code snippet if template and line number available
    if (template) {
      const lineMatch = message.match(/line[:\s]+(\d+)/i);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1], 10);
        const lines = template.split("\n");

        // Get surrounding lines (2 before, error line, 2 after)
        const start = Math.max(0, lineNum - 3);
        const end = Math.min(lines.length, lineNum + 2);
        const snippetLines = lines.slice(start, end);

        context.snippet = snippetLines
          .map((line, idx) => {
            const actualLineNum = start + idx + 1;
            const marker = actualLineNum === lineNum ? "> " : "  ";
            return `${marker}${actualLineNum}: ${line}`;
          })
          .join("\n");
      }
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  /**
   * Format error for display
   *
   * @param error - Template error
   * @returns Formatted error message
   */
  static formatError(error: TemplateError): string {
    let formatted = `[${error.type}] ${error.message}`;

    if (error.line) {
      formatted += `\n  at line ${error.line}`;
      if (error.column) {
        formatted += `, column ${error.column}`;
      }
    }

    if (error.context) {
      if (error.context.variable) {
        formatted += `\n  Variable: ${error.context.variable}`;
      }
      if (error.context.filter) {
        formatted += `\n  Filter: ${error.context.filter}`;
      }
      if (error.context.tag) {
        formatted += `\n  Tag: ${error.context.tag}`;
      }
      if (error.context.snippet) {
        formatted += `\n\nCode:\n${error.context.snippet}`;
      }
    }

    if (error.suggestion) {
      formatted += `\n\nSuggestion: ${error.suggestion}`;
    }

    return formatted;
  }
}
