import { createDeclarativeFilter, parseDeclarativeFilterDefinition } from "./CustomFilterValidator";

export interface EvalResult {
  result?: unknown;
  error?: string;
  logs: string[];
}

/**
 * Evaluates one bounded, declarative filter operation.
 *
 * The legacy implementation launched a worker and evaluated JavaScript source.
 * This implementation deliberately has no code-evaluation primitive.
 */
export class IsolatedEvaluator {
  static async evaluate(
    definitionJson: string,
    context: Record<string, unknown>,
    _timeout: number
  ): Promise<EvalResult> {
    try {
      const definition = parseDeclarativeFilterDefinition(definitionJson);
      const filter = createDeclarativeFilter(definition);
      const args = Array.isArray(context.args) ? context.args : [];

      return {
        result: filter(context.value, ...args),
        logs: [],
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        logs: [],
      };
    }
  }
}
