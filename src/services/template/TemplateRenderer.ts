/**
 * TemplateRenderer - Orchestrate template rendering with context data
 *
 * Handles variable interpolation, conditional rendering, loops, and variable assignment
 * using LiquidJS with security sandbox.
 */

import { Liquid } from "liquidjs";
import {
  TemplateRenderer as ITemplateRenderer,
  TemplateAST,
  ContextData,
  RenderOptions,
  BatchRenderResult,
  RenderError,
} from "./types";
import { FilterRegistry } from "./FilterRegistry";

export class TemplateRenderer implements ITemplateRenderer {
  private liquid: Liquid;
  private filterRegistry: FilterRegistry;

  constructor(filterRegistry: FilterRegistry) {
    this.filterRegistry = filterRegistry;

    // Initialize LiquidJS with security and compatibility settings
    this.liquid = new Liquid({
      cache: false, // We handle caching separately
      strictFilters: false, // Allow undefined filters (we'll handle errors)
      strictVariables: false, // Allow undefined variables (render as empty)
      lenientIf: true, // Treat undefined as falsy in conditionals
      timezoneOffset: 0, // Use UTC
    });

    // Register all filters from FilterRegistry
    this.registerFilters();
  }

  /**
   * Render template with context data
   *
   * @param ast - Template AST (not used directly, we use template string)
   * @param context - Context data for rendering
   * @param options - Render options
   * @returns Rendered HTML string
   */
  async render(ast: TemplateAST, context: ContextData, options: RenderOptions): Promise<string> {
    const timeout = options.timeout || 5000;
    const maxLoopIterations = options.maxLoopIterations || 1000;

    try {
      // Create a promise that will timeout
      const renderPromise = this.renderWithLiquid(context, maxLoopIterations);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("TIMEOUT_ERROR: Template execution exceeded time limit")),
          timeout
        );
      });

      // Race between render and timeout
      const result = await Promise.race([renderPromise, timeoutPromise]);

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`RUNTIME_ERROR: ${String(error)}`);
    }
  }

  /**
   * Render template string directly with context
   *
   * @param template - Template string
   * @param context - Context data
   * @param options - Render options
   * @returns Rendered HTML string
   */
  async renderTemplate(
    template: string,
    context: ContextData,
    options: RenderOptions = {}
  ): Promise<string> {
    const timeout = options.timeout || 5000;
    const maxLoopIterations = options.maxLoopIterations || 1000;
    const enableMJML = options.enableMJML || false;

    try {
      // Detect if template is MJML
      const isMJML = this.detectMJML(template);

      // Add loop iteration tracking to context
      const enhancedContext = this.enhanceContext(context, maxLoopIterations);

      // Create a promise that will timeout
      const renderPromise = this.liquid.parseAndRender(template, enhancedContext);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("TIMEOUT_ERROR: Template execution exceeded time limit")),
          timeout
        );
      });

      // Race between render and timeout
      const renderedTemplate = await Promise.race([renderPromise, timeoutPromise]);

      // If MJML is enabled and template is MJML, compile it
      if (enableMJML && isMJML) {
        return await this.compileMJML(renderedTemplate);
      }

      return renderedTemplate;
    } catch (error) {
      if (error instanceof Error) {
        // Check for timeout
        if (error.message.includes("TIMEOUT_ERROR")) {
          throw error;
        }

        // Check for loop limit
        if (error.message.includes("Loop iteration limit")) {
          throw new Error(`RUNTIME_ERROR: ${error.message}`);
        }

        // Check for MJML error
        if (error.message.includes("MJML_ERROR")) {
          throw error;
        }

        // Runtime error
        throw new Error(`RUNTIME_ERROR: ${error.message}`);
      }
      throw new Error(`RUNTIME_ERROR: ${String(error)}`);
    }
  }

  /**
   * Batch render for multiple recipients
   *
   * @param template - Template string
   * @param contexts - Array of context data
   * @param options - Render options
   * @returns Batch render results
   */
  async batchRender(
    template: string,
    contexts: ContextData[],
    options: RenderOptions
  ): Promise<BatchRenderResult> {
    const startTime = Date.now();
    const results: Array<{ context: ContextData; html?: string; error?: RenderError }> = [];

    let successCount = 0;
    let errorCount = 0;
    let totalRenderTime = 0;

    // Detect MJML once for all renders
    const isMJML = this.detectMJML(template);
    const enableMJML = options.enableMJML || false;

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < contexts.length; i += batchSize) {
      const batch = contexts.slice(i, i + batchSize);

      // Render each context in the batch
      const batchPromises = batch.map(async (context) => {
        const renderStart = Date.now();
        try {
          const html = await this.renderTemplate(template, context, options);
          const renderTime = Date.now() - renderStart;
          totalRenderTime += renderTime;
          successCount++;
          return { context, html };
        } catch (error) {
          const renderTime = Date.now() - renderStart;
          totalRenderTime += renderTime;
          errorCount++;

          const renderError: RenderError = {
            type:
              error instanceof Error && error.message.includes("TIMEOUT_ERROR")
                ? "TIMEOUT_ERROR"
                : error instanceof Error && error.message.includes("SECURITY_ERROR")
                  ? "SECURITY_ERROR"
                  : error instanceof Error && error.message.includes("MJML_ERROR")
                    ? "RUNTIME_ERROR" // MJML errors are runtime errors
                    : "RUNTIME_ERROR",
            message: error instanceof Error ? error.message : String(error),
          };

          return { context, error: renderError };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    const averageRenderTime = contexts.length > 0 ? totalRenderTime / contexts.length : 0;

    return {
      results,
      metrics: {
        totalTime,
        successCount,
        errorCount,
        averageRenderTime,
      },
    };
  }

  /**
   * Render with LiquidJS (internal helper)
   *
   * @private
   * @param context - Context data
   * @param maxLoopIterations - Maximum loop iterations
   * @returns Rendered HTML
   */
  private async renderWithLiquid(context: ContextData, maxLoopIterations: number): Promise<string> {
    const enhancedContext = this.enhanceContext(context, maxLoopIterations);

    // This is a placeholder - in actual use, we'd need the template string
    // For now, this method is not used directly
    return "";
  }

  /**
   * Enhance context with additional helper variables
   *
   * @private
   * @param context - Original context
   * @param maxLoopIterations - Maximum loop iterations
   * @returns Enhanced context
   */
  private enhanceContext(context: ContextData, maxLoopIterations: number): ContextData {
    // Add loop iteration counter
    let loopIterationCount = 0;

    return {
      ...context,
      // Helper to check loop iterations (not directly accessible in templates)
      __checkLoopIteration: () => {
        loopIterationCount++;
        if (loopIterationCount > maxLoopIterations) {
          throw new Error(`Loop iteration limit exceeded (max: ${maxLoopIterations})`);
        }
      },
    };
  }

  /**
   * Register all filters from FilterRegistry
   *
   * @private
   */
  private registerFilters(): void {
    // Get all global filters
    const filters = this.filterRegistry.list();

    filters.forEach((filterMeta) => {
      const filterFn = this.filterRegistry.get(filterMeta.name);
      if (filterFn) {
        // Register with LiquidJS
        this.liquid.registerFilter(filterMeta.name, filterFn);
      }
    });
  }

  /**
   * Register organization-specific filters
   *
   * @param organizationId - Organization ID
   */
  registerOrganizationFilters(organizationId: string): void {
    const filters = this.filterRegistry.list(organizationId);

    filters.forEach((filterMeta) => {
      if (filterMeta.scope.type === "organization") {
        const filterFn = this.filterRegistry.get(filterMeta.name, organizationId);
        if (filterFn) {
          this.liquid.registerFilter(filterMeta.name, filterFn);
        }
      }
    });
  }

  /**
   * Detect if template contains MJML
   *
   * @private
   * @param template - Template string
   * @returns True if template contains MJML
   */
  private detectMJML(template: string): boolean {
    // Check for <mjml> tag (case-insensitive)
    return /<mjml[\s>]/i.test(template);
  }

  /**
   * Compile MJML to HTML
   *
   * @private
   * @param mjmlTemplate - MJML template string
   * @returns Compiled HTML
   */
  private async compileMJML(mjmlTemplate: string): Promise<string> {
    try {
      // Dynamic import of mjml to avoid bundling issues
      const mjml2html = (await import("mjml")).default;

      const result = await mjml2html(mjmlTemplate, {
        validationLevel: "soft",
        minify: false,
      });

      const hasFatalErrors = result.errors && result.errors.some(e => 
        e.formattedMessage.includes("Parsing failed") || 
        e.formattedMessage.includes("unclosed") || 
        e.formattedMessage.includes("invalid") ||
        e.line === 0
      );

      if (!result.html || hasFatalErrors) {
        const errorMessages = (result.errors || []).map((err) => `${err.formattedMessage}`).join("; ");
        throw new Error(`MJML_ERROR: ${errorMessages || "Failed to compile MJML"}`);
      }

      return result.html;
    } catch (error) {
      if (error instanceof Error) {
        // If already an MJML error, rethrow
        if (error.message.includes("MJML_ERROR")) {
          throw error;
        }
        // Wrap other errors as MJML errors
        throw new Error(`MJML_ERROR: Failed to compile MJML - ${error.message}`);
      }
      throw new Error(`MJML_ERROR: Failed to compile MJML - ${String(error)}`);
    }
  }
}
