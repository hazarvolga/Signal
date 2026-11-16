/**
 * TemplateEngine - Orchestrate template parsing, validation, and rendering
 *
 * Main entry point for template operations, coordinating parser, cache, and renderer.
 */

import {
  TemplateEngine as ITemplateEngine,
  ParseResult,
  RenderResult,
  ValidationResult,
  RenderOptions,
  FilterFunction,
  ContextData,
  RenderMetrics,
  TemplateCache as ITemplateCache,
} from "./types";
import { TemplateParser } from "./TemplateParser";
import { TemplateRenderer } from "./TemplateRenderer";
import { RedisTemplateCache, InMemoryTemplateCache } from "./TemplateCache";
import { FilterRegistry } from "./FilterRegistry";
import { ErrorHandler } from "./ErrorHandler";
import Redis from "ioredis";

export class TemplateEngine implements ITemplateEngine {
  private parser: TemplateParser;
  private renderer: TemplateRenderer;
  private cache: ITemplateCache;
  private filterRegistry: FilterRegistry;

  constructor(redis?: Redis) {
    this.parser = new TemplateParser();
    this.filterRegistry = new FilterRegistry();
    this.renderer = new TemplateRenderer(this.filterRegistry);

    // Use Redis cache if available, otherwise in-memory
    this.cache = redis ? new RedisTemplateCache(redis) : new InMemoryTemplateCache();
  }

  /**
   * Parse template and return AST or validation errors
   *
   * @param template - Template string to parse
   * @returns Parse result with AST or errors
   */
  parse(template: string): ParseResult {
    try {
      const ast = this.parser.parse(template);
      return {
        success: true,
        ast,
      };
    } catch (error) {
      const templateError = {
        ...ErrorHandler.createError(
          error instanceof Error ? error : new Error(String(error)),
          template
        ),
        type: "SYNTAX_ERROR" as const,
      };

      return {
        success: false,
        errors: [templateError],
      };
    }
  }

  /**
   * Render template with context data
   *
   * @param template - Template string
   * @param context - Context data for rendering
   * @param options - Render options
   * @returns Render result with HTML or errors
   */
  async render(
    template: string,
    context: ContextData,
    options: RenderOptions = {}
  ): Promise<RenderResult> {
    const startTime = Date.now();
    let parseTime = 0;
    let renderTime = 0;
    let cacheHit = false;

    try {
      // Check cache first
      const cacheKey = InMemoryTemplateCache.generateKey(template);
      const cached = await this.cache.get(cacheKey);

      let ast;
      if (cached) {
        ast = cached.ast;
        cacheHit = true;
      } else {
        // Parse template
        const parseStart = Date.now();
        ast = this.parser.parse(template);
        parseTime = Date.now() - parseStart;

        // Store in cache
        await this.cache.set(cacheKey, {
          ast,
          hash: cacheKey,
          compiledAt: new Date(),
          metadata: {
            variableCount: this.parser.extractVariables(template).length,
            filterCount: 0, // TODO: count filters
            loopCount: 0, // TODO: count loops
          },
        });
      }

      // Render template
      const renderStart = Date.now();
      const html = await this.renderer.renderTemplate(template, context, options);
      renderTime = Date.now() - renderStart;

      const totalTime = Date.now() - startTime;

      const metrics: RenderMetrics = {
        parseTime,
        renderTime,
        totalTime,
        cacheHit,
      };

      return {
        success: true,
        html,
        metrics,
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;

      // Create enhanced error with categorization and suggestions
      const templateError = ErrorHandler.createError(
        error instanceof Error ? error : new Error(String(error)),
        template
      );

      return {
        success: false,
        errors: [templateError],
        metrics: {
          parseTime,
          renderTime,
          totalTime,
          cacheHit,
        },
      };
    }
  }

  /**
   * Validate template syntax without rendering
   *
   * @param template - Template string to validate
   * @returns Validation result
   */
  validate(template: string): ValidationResult {
    try {
      this.parser.parse(template);
      return {
        valid: true,
      };
    } catch (error) {
      const validationError = ErrorHandler.createError(
        error instanceof Error ? error : new Error(String(error)),
        template
      );

      return {
        valid: false,
        errors: [validationError],
      };
    }
  }

  /**
   * Register custom filter
   *
   * @param name - Filter name
   * @param fn - Filter function
   * @param organizationId - Organization ID for scoped filter
   */
  registerFilter(name: string, fn: FilterFunction, organizationId: string): void {
    this.filterRegistry.register(name, fn, {
      type: "organization",
      organizationId,
    });

    // Re-register filters with renderer
    this.renderer.registerOrganizationFilters(organizationId);
  }

  /**
   * Pretty print template (normalize formatting)
   *
   * @param template - Template string to format
   * @returns Formatted template string
   */
  prettyPrint(template: string): string {
    return this.parser.prettyPrint(template);
  }

  /**
   * Get filter registry for accessing filters
   *
   * @returns Filter registry instance
   */
  getFilterRegistry(): FilterRegistry {
    return this.filterRegistry;
  }

  /**
   * Invalidate cache for a specific template
   *
   * @param template - Template string
   */
  async invalidateCache(template: string): Promise<void> {
    const cacheKey = InMemoryTemplateCache.generateKey(template);
    await this.cache.invalidate(cacheKey);
  }

  /**
   * Clear all cached templates
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}
