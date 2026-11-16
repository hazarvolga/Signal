/**
 * FilterRegistry - Manage built-in and custom filters
 *
 * Provides a registry for template filters with support for
 * global and organization-scoped custom filters.
 */

import { format as formatDate } from "date-fns";
import {
  FilterRegistry as IFilterRegistry,
  FilterFunction,
  FilterScope,
  FilterMetadata,
} from "./types";
import { CustomFilterValidator } from "./CustomFilterValidator";

export class FilterRegistry implements IFilterRegistry {
  private filters: Map<
    string,
    { fn: FilterFunction; scope: FilterScope; metadata: FilterMetadata }
  >;
  private customFilterValidator: CustomFilterValidator;

  constructor() {
    this.filters = new Map();
    this.customFilterValidator = new CustomFilterValidator();
    this.registerBuiltInFilters();
  }

  /**
   * Register a new filter
   *
   * @param name - Filter name
   * @param fn - Filter function
   * @param scope - Filter scope (global or organization)
   */
  register(name: string, fn: FilterFunction, scope: FilterScope): void {
    const metadata: FilterMetadata = {
      name,
      description: `Custom filter: ${name}`,
      signature: fn.toString(),
      examples: [],
      scope,
    };

    const key = this.getFilterKey(name, scope.organizationId);
    this.filters.set(key, { fn, scope, metadata });
  }

  /**
   * Register a custom filter from a declarative JSON definition.
   *
   * Executable JavaScript is intentionally unsupported.
   */
  registerCustomFilter(
    name: string,
    definitionJson: string,
    scope: FilterScope,
    description?: string,
    examples?: string[]
  ): void {
    const validationResult = this.customFilterValidator.validateAndCompile(definitionJson, name);

    if (!validationResult.valid || !validationResult.compiledFunction) {
      throw new Error(`Failed to register custom filter "${name}": ${validationResult.error}`);
    }

    const signature = this.customFilterValidator.extractSignature(definitionJson);

    // Create metadata
    const metadata: FilterMetadata = {
      name,
      description: description || `Custom filter: ${name}`,
      signature,
      examples: examples || [],
      scope,
    };

    // Register the compiled filter
    const key = this.getFilterKey(name, scope.organizationId);
    this.filters.set(key, {
      fn: validationResult.compiledFunction,
      scope,
      metadata,
    });
  }

  /**
   * Get filter by name
   *
   * @param name - Filter name
   * @param organizationId - Organization ID for scoped filters
   * @returns Filter function or undefined
   */
  get(name: string, organizationId?: string): FilterFunction | undefined {
    // Try organization-scoped filter first
    if (organizationId) {
      const orgKey = this.getFilterKey(name, organizationId);
      const orgFilter = this.filters.get(orgKey);
      if (orgFilter) {
        return orgFilter.fn;
      }
    }

    // Fall back to global filter
    const globalKey = this.getFilterKey(name);
    const globalFilter = this.filters.get(globalKey);
    return globalFilter?.fn;
  }

  /**
   * List all available filters
   *
   * @param organizationId - Organization ID to include scoped filters
   * @returns Array of filter metadata
   */
  list(organizationId?: string): FilterMetadata[] {
    const result: FilterMetadata[] = [];

    for (const [key, { metadata, scope }] of this.filters.entries()) {
      // Include global filters
      if (scope.type === "global") {
        result.push(metadata);
      }
      // Include organization-scoped filters if organizationId matches
      else if (scope.type === "organization" && scope.organizationId === organizationId) {
        result.push(metadata);
      }
    }

    return result;
  }

  /**
   * Generate filter key for storage
   *
   * @private
   * @param name - Filter name
   * @param organizationId - Optional organization ID
   * @returns Filter key
   */
  private getFilterKey(name: string, organizationId?: string): string {
    return organizationId ? `${organizationId}:${name}` : `global:${name}`;
  }

  /**
   * Register all built-in filters
   *
   * @private
   */
  private registerBuiltInFilters(): void {
    const globalScope: FilterScope = { type: "global" };

    // String filters
    this.register("upcase", this.upcase, globalScope);
    this.register("downcase", this.downcase, globalScope);
    this.register("capitalize", this.capitalize, globalScope);
    this.register("truncate", this.truncate, globalScope);
    this.register("strip_html", this.stripHtml, globalScope);
    this.register("url_encode", this.urlEncode, globalScope);

    // Number filters
    this.register("money", this.money, globalScope);
    this.register("plus", this.plus, globalScope);
    this.register("minus", this.minus, globalScope);
    this.register("times", this.times, globalScope);
    this.register("divided_by", this.dividedBy, globalScope);
    this.register("modulo", this.modulo, globalScope);

    // Date filters
    this.register("date", this.date, globalScope);

    // Utility filters
    this.register("default", this.default, globalScope);

    // Update metadata for built-in filters
    this.updateBuiltInMetadata();
  }

  /**
   * Update metadata for built-in filters with descriptions and examples
   *
   * @private
   */
  private updateBuiltInMetadata(): void {
    const builtInMetadata: Record<string, Omit<FilterMetadata, "name" | "scope">> = {
      upcase: {
        description: "Convert string to uppercase",
        signature: "(value: string) => string",
        examples: ['{{ "hello" | upcase }} => "HELLO"'],
      },
      downcase: {
        description: "Convert string to lowercase",
        signature: "(value: string) => string",
        examples: ['{{ "HELLO" | downcase }} => "hello"'],
      },
      capitalize: {
        description: "Capitalize first letter",
        signature: "(value: string) => string",
        examples: ['{{ "hello" | capitalize }} => "Hello"'],
      },
      truncate: {
        description: "Truncate string to specified length",
        signature: "(value: string, length: number) => string",
        examples: ['{{ "Hello World" | truncate: 5 }} => "Hello..."'],
      },
      strip_html: {
        description: "Remove HTML tags from string",
        signature: "(value: string) => string",
        examples: ['{{ "<p>Hello</p>" | strip_html }} => "Hello"'],
      },
      url_encode: {
        description: "URL encode string",
        signature: "(value: string) => string",
        examples: ['{{ "hello world" | url_encode }} => "hello%20world"'],
      },
      money: {
        description: "Format number as currency",
        signature: "(value: number, currency?: string) => string",
        examples: ['{{ 42.50 | money }} => "$42.50"', '{{ 42.50 | money: "EUR" }} => "€42.50"'],
      },
      plus: {
        description: "Add numbers",
        signature: "(value: number, operand: number) => number",
        examples: ["{{ 5 | plus: 3 }} => 8"],
      },
      minus: {
        description: "Subtract numbers",
        signature: "(value: number, operand: number) => number",
        examples: ["{{ 5 | minus: 3 }} => 2"],
      },
      times: {
        description: "Multiply numbers",
        signature: "(value: number, operand: number) => number",
        examples: ["{{ 5 | times: 3 }} => 15"],
      },
      divided_by: {
        description: "Divide numbers",
        signature: "(value: number, operand: number) => number",
        examples: ["{{ 15 | divided_by: 3 }} => 5"],
      },
      modulo: {
        description: "Get remainder of division",
        signature: "(value: number, operand: number) => number",
        examples: ["{{ 7 | modulo: 3 }} => 1"],
      },
      date: {
        description: "Format date",
        signature: "(value: Date | string, format: string) => string",
        examples: ['{{ date | date: "MMMM dd, yyyy" }} => "January 01, 2024"'],
      },
      default: {
        description: "Provide fallback value",
        signature: "(value: any, fallback: any) => any",
        examples: ['{{ undefined | default: "N/A" }} => "N/A"'],
      },
    };

    for (const [name, meta] of Object.entries(builtInMetadata)) {
      const key = this.getFilterKey(name);
      const filter = this.filters.get(key);
      if (filter) {
        filter.metadata = {
          name,
          ...meta,
          scope: { type: "global" },
        };
      }
    }
  }

  // ============================================================================
  // Built-in Filter Implementations
  // ============================================================================

  private upcase(value: any): string {
    return String(value).toUpperCase();
  }

  private downcase(value: any): string {
    return String(value).toLowerCase();
  }

  private capitalize(value: any): string {
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private truncate(value: any, length: number): string {
    const str = String(value);
    if (str.length <= length) {
      return str;
    }
    return str.slice(0, length) + "...";
  }

  private stripHtml(value: any): string {
    return String(value).replace(/<[^>]*>/g, "");
  }

  private urlEncode(value: any): string {
    return encodeURIComponent(String(value));
  }

  private money(value: any, currency: string = "USD"): string {
    const num = Number(value);
    if (isNaN(num)) {
      return "";
    }

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(num);
    } catch (error) {
      // Fallback for invalid currency
      return `$${num.toFixed(2)}`;
    }
  }

  private plus(value: any, operand: any): number {
    return Number(value) + Number(operand);
  }

  private minus(value: any, operand: any): number {
    return Number(value) - Number(operand);
  }

  private times(value: any, operand: any): number {
    return Number(value) * Number(operand);
  }

  private dividedBy(value: any, operand: any): number {
    const divisor = Number(operand);
    if (divisor === 0) {
      return 0; // Avoid division by zero
    }
    return Number(value) / divisor;
  }

  private modulo(value: any, operand: any): number {
    return Number(value) % Number(operand);
  }

  private date(value: any, format: string): string {
    try {
      const dateObj = value instanceof Date ? value : new Date(value);
      if (isNaN(dateObj.getTime())) {
        return "";
      }
      return formatDate(dateObj, format);
    } catch (error) {
      return "";
    }
  }

  private default(value: any, fallback: any): any {
    return value ?? fallback;
  }
}
