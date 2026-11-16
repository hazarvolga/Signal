/**
 * Template Engine Type Definitions
 *
 * Core interfaces and types for the advanced template engine system.
 */

// ============================================================================
// Core Interfaces
// ============================================================================

export interface TemplateEngine {
  /**
   * Parse template and return AST or validation errors
   */
  parse(template: string): ParseResult;

  /**
   * Render template with context data
   */
  render(template: string, context: ContextData, options?: RenderOptions): Promise<RenderResult>;

  /**
   * Validate template syntax without rendering
   */
  validate(template: string): ValidationResult;

  /**
   * Register custom filter
   */
  registerFilter(name: string, fn: FilterFunction, organizationId: string): void;

  /**
   * Pretty print template (normalize formatting)
   */
  prettyPrint(template: string): string;
}

export interface ParseResult {
  success: boolean;
  ast?: TemplateAST;
  errors?: SyntaxError[];
}

export interface RenderResult {
  success: boolean;
  html?: string;
  errors?: TemplateError[];
  metrics?: RenderMetrics;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface RenderOptions {
  timeout?: number; // default 5000ms
  maxLoopIterations?: number; // default 1000
  maxMemory?: number; // default 50MB
  enableMJML?: boolean; // default false
}

export interface RenderMetrics {
  parseTime: number;
  renderTime: number;
  mjmlCompileTime?: number;
  totalTime: number;
  cacheHit: boolean;
}

// ============================================================================
// Parser Interfaces
// ============================================================================

export interface TemplateParser {
  /**
   * Parse template string to AST
   */
  parse(template: string): TemplateAST;

  /**
   * Detect if template uses legacy or advanced syntax
   */
  detectSyntaxType(template: string): "legacy" | "advanced" | "mixed";

  /**
   * Extract all variables used in template
   */
  extractVariables(template: string): string[];
}

export interface TemplateAST {
  type: "root";
  children: ASTNode[];
}

export type ASTNode = TextNode | VariableNode | TagNode | FilterNode;

export interface TextNode {
  type: "text";
  value: string;
}

export interface VariableNode {
  type: "variable";
  name: string;
  filters?: FilterNode[];
}

export interface TagNode {
  type: "tag";
  name: "if" | "for" | "assign" | "capture" | "unless";
  params: Record<string, any>;
  children?: ASTNode[];
}

export interface FilterNode {
  type: "filter";
  name: string;
  args: any[];
}

// ============================================================================
// Renderer Interfaces
// ============================================================================

export interface TemplateRenderer {
  /**
   * Render template with context
   */
  render(ast: TemplateAST, context: ContextData, options: RenderOptions): Promise<string>;

  /**
   * Batch render for multiple recipients
   */
  batchRender(
    template: string,
    contexts: ContextData[],
    options: RenderOptions
  ): Promise<BatchRenderResult>;
}

export interface ContextData {
  [key: string]: any;
  user?: UserContext;
  products?: ProductContext[];
  campaign?: CampaignContext;
  organization?: OrganizationContext;
}

export interface UserContext {
  [key: string]: unknown;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isPremium?: boolean;
  purchaseCount?: number;
  customFields?: Record<string, any>;
}

export interface ProductContext {
  [key: string]: unknown;
  id?: string;
  name?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  productUrl?: string;
}

export interface CampaignContext {
  [key: string]: unknown;
  id?: string;
  name?: string;
  variation?: string;
}

export interface OrganizationContext {
  [key: string]: unknown;
  name?: string;
  logoUrl?: string;
  address?: string;
}

export interface BatchRenderResult {
  results: Array<{
    context: ContextData;
    html?: string;
    error?: RenderError;
  }>;
  metrics: {
    totalTime: number;
    successCount: number;
    errorCount: number;
    averageRenderTime: number;
  };
}

// ============================================================================
// Filter Interfaces
// ============================================================================

export interface FilterRegistry {
  /**
   * Register a new filter
   */
  register(name: string, fn: FilterFunction, scope: FilterScope): void;

  /**
   * Get filter by name
   */
  get(name: string, organizationId?: string): FilterFunction | undefined;

  /**
   * List all available filters
   */
  list(organizationId?: string): FilterMetadata[];
}

export type FilterFunction = (value: any, ...args: any[]) => any;

export interface FilterScope {
  type: "global" | "organization";
  organizationId?: string;
}

export interface FilterMetadata {
  name: string;
  description: string;
  signature: string;
  examples: string[];
  scope: FilterScope;
}

// ============================================================================
// Sandbox Interfaces
// ============================================================================

export interface SandboxExecutor {
  /**
   * Execute template in sandbox
   */
  execute(code: string, context: ContextData, limits: SandboxLimits): Promise<string>;
}

export interface SandboxLimits {
  timeout: number; // milliseconds
  maxMemory: number; // bytes
  maxLoopIterations: number;
}

// ============================================================================
// Cache Interfaces
// ============================================================================

export interface TemplateCache {
  /**
   * Get compiled template from cache
   */
  get(key: string): Promise<CompiledTemplate | undefined>;

  /**
   * Store compiled template in cache
   */
  set(key: string, template: CompiledTemplate, ttl?: number): Promise<void>;

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): Promise<void>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;
}

export interface CompiledTemplate {
  ast: TemplateAST;
  hash: string;
  compiledAt: Date;
  metadata: {
    variableCount: number;
    filterCount: number;
    loopCount: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export type TemplateErrorType =
  "SYNTAX_ERROR" | "RUNTIME_ERROR" | "TIMEOUT_ERROR" | "SECURITY_ERROR";

export interface TemplateError {
  type: TemplateErrorType;
  message: string;
  line?: number;
  column?: number;
  context?: {
    variable?: string;
    filter?: string;
    tag?: string;
    snippet?: string;
  };
  suggestion?: string;
  stack?: string;
}

export type SyntaxError = TemplateError & { type: "SYNTAX_ERROR" };
export type RenderError = TemplateError & {
  type: "RUNTIME_ERROR" | "TIMEOUT_ERROR" | "SECURITY_ERROR";
};
export type ValidationError = TemplateError;
export type ValidationWarning = Omit<TemplateError, "type"> & { severity: "warning" };
