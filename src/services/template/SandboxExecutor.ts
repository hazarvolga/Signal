/**
 * Executes bounded declarative template-filter operations.
 *
 * Despite the retained class name, this is no longer a JavaScript sandbox:
 * arbitrary source execution is not a supported feature.
 */

import { parseDeclarativeFilterDefinition } from "./CustomFilterValidator";
import { IsolatedEvaluator } from "./IsolatedEvaluator";
import type { SandboxExecutor as ISandboxExecutor, SandboxLimits, ContextData } from "./types";

export class SandboxExecutor implements ISandboxExecutor {
  async execute(
    definitionJson: string,
    context: ContextData,
    limits: SandboxLimits
  ): Promise<string> {
    this.validateLimits(limits);
    this.validateCode(definitionJson);

    const safeContext = this.createSafeContext(context);
    const result = await IsolatedEvaluator.evaluate(definitionJson, safeContext, limits.timeout);

    if (result.error) {
      throw new Error(`SECURITY_ERROR: ${result.error}`);
    }

    return String(result.result ?? "");
  }

  /**
   * Retained for interface compatibility. It now validates JSON data rather
   * than attempting to determine whether JavaScript source looks safe.
   */
  validateCode(definitionJson: string): void {
    try {
      parseDeclarativeFilterDefinition(definitionJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`SECURITY_ERROR: ${message}`);
    }
  }

  private validateLimits(limits: SandboxLimits): void {
    if (
      !Number.isFinite(limits.timeout) ||
      limits.timeout <= 0 ||
      !Number.isFinite(limits.maxMemory) ||
      limits.maxMemory <= 0 ||
      !Number.isFinite(limits.maxLoopIterations) ||
      limits.maxLoopIterations <= 0
    ) {
      throw new Error("SECURITY_ERROR: Sandbox limits must be positive finite numbers");
    }
  }

  private createSafeContext(context: ContextData): Record<string, unknown> {
    return {
      value: this.toPlainData(context.value),
      args: Array.isArray(context.args)
        ? context.args.slice(0, 8).map((value) => this.toPlainData(value))
        : [],
    };
  }

  private toPlainData(value: unknown, depth = 0): unknown {
    if (depth > 8) {
      throw new Error("SECURITY_ERROR: Context nesting limit exceeded");
    }
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "undefined"
    ) {
      return value;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    if (Array.isArray(value)) {
      return value.slice(0, 1_000).map((item) => this.toPlainData(item, depth + 1));
    }
    if (typeof value === "object") {
      const plain: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(value).slice(0, 1_000)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
        plain[key] = this.toPlainData(nestedValue, depth + 1);
      }
      return plain;
    }
    return undefined;
  }
}
