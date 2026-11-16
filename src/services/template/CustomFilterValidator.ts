/**
 * Validates declarative custom-filter definitions.
 *
 * Custom filters intentionally do not accept JavaScript source. A definition is
 * JSON containing one allowlisted operation and optional primitive arguments.
 */

import type { FilterFunction } from "./types";

export const DECLARATIVE_FILTER_OPERATIONS = [
  "uppercase",
  "upcase",
  "lowercase",
  "downcase",
  "trim",
  "capitalize",
  "prefix",
  "suffix",
  "truncate",
  "strip_html",
  "url_encode",
  "plus",
  "minus",
  "times",
  "divided_by",
  "modulo",
  "default",
] as const;

export type DeclarativeFilterOperation = (typeof DECLARATIVE_FILTER_OPERATIONS)[number];
export type DeclarativeFilterArgument = string | number | boolean | null;

export interface DeclarativeFilterDefinition {
  operation: DeclarativeFilterOperation;
  args?: DeclarativeFilterArgument[];
}

export interface CustomFilterValidationResult {
  valid: boolean;
  error?: string;
  compiledFunction?: FilterFunction;
  definition?: DeclarativeFilterDefinition;
}

const ALLOWED_OPERATIONS = new Set<string>(DECLARATIVE_FILTER_OPERATIONS);
const MAX_DEFINITION_LENGTH = 4_096;
const MAX_ARGUMENT_COUNT = 8;
const MAX_ARGUMENT_STRING_LENGTH = 1_000;
const MAX_OUTPUT_STRING_LENGTH = 1_000_000;

function isPrimitiveArgument(value: unknown): value is DeclarativeFilterArgument {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function toBoundedString(value: unknown): string {
  return String(value ?? "").slice(0, MAX_OUTPUT_STRING_LENGTH);
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectArguments(
  runtimeArgs: unknown[],
  configuredArgs: DeclarativeFilterArgument[]
): DeclarativeFilterArgument[] {
  if (runtimeArgs.length === 0) {
    return configuredArgs;
  }
  if (
    runtimeArgs.length > MAX_ARGUMENT_COUNT ||
    !runtimeArgs.every(
      (argument) =>
        isPrimitiveArgument(argument) &&
        (typeof argument !== "string" || argument.length <= MAX_ARGUMENT_STRING_LENGTH)
    )
  ) {
    throw new Error("Runtime filter args may contain only bounded primitive values");
  }
  return runtimeArgs as DeclarativeFilterArgument[];
}

export function parseDeclarativeFilterDefinition(input: string): DeclarativeFilterDefinition {
  if (!input || input.trim().length === 0) {
    throw new Error("Filter definition cannot be empty");
  }
  if (input.length > MAX_DEFINITION_LENGTH) {
    throw new Error(`Filter definition exceeds ${MAX_DEFINITION_LENGTH} characters`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Filter definition must be valid JSON; executable JavaScript is not allowed");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Filter definition must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => key !== "operation" && key !== "args")) {
    throw new Error("Filter definition contains unsupported fields");
  }

  if (typeof record.operation !== "string" || !ALLOWED_OPERATIONS.has(record.operation)) {
    throw new Error(
      `Unsupported filter operation. Allowed operations: ${DECLARATIVE_FILTER_OPERATIONS.join(", ")}`
    );
  }

  if (record.args !== undefined) {
    if (!Array.isArray(record.args) || record.args.length > MAX_ARGUMENT_COUNT) {
      throw new Error(`Filter args must be an array with at most ${MAX_ARGUMENT_COUNT} values`);
    }
    if (
      !record.args.every(
        (argument) =>
          isPrimitiveArgument(argument) &&
          (typeof argument !== "string" || argument.length <= MAX_ARGUMENT_STRING_LENGTH)
      )
    ) {
      throw new Error("Filter args may contain only bounded primitive values");
    }
  }

  return {
    operation: record.operation as DeclarativeFilterOperation,
    ...(record.args ? { args: record.args as DeclarativeFilterArgument[] } : {}),
  };
}

export function createDeclarativeFilter(definition: DeclarativeFilterDefinition): FilterFunction {
  return (value: unknown, ...runtimeArgs: unknown[]): unknown => {
    try {
      const args = selectArguments(runtimeArgs, definition.args ?? []);
      const firstArg = args[0];

      switch (definition.operation) {
        case "uppercase":
        case "upcase":
          return toBoundedString(value).toUpperCase();
        case "lowercase":
        case "downcase":
          return toBoundedString(value).toLowerCase();
        case "trim":
          return toBoundedString(value).trim();
        case "capitalize": {
          const text = toBoundedString(value);
          return text.charAt(0).toUpperCase() + text.slice(1);
        }
        case "prefix":
          return `${toBoundedString(firstArg)}${toBoundedString(value)}`.slice(
            0,
            MAX_OUTPUT_STRING_LENGTH
          );
        case "suffix":
          return `${toBoundedString(value)}${toBoundedString(firstArg)}`.slice(
            0,
            MAX_OUTPUT_STRING_LENGTH
          );
        case "truncate": {
          const text = toBoundedString(value);
          const length = Math.max(
            0,
            Math.min(Math.trunc(toFiniteNumber(firstArg)), MAX_OUTPUT_STRING_LENGTH)
          );
          return text.length <= length ? text : `${text.slice(0, length)}...`;
        }
        case "strip_html":
          return toBoundedString(value).replace(/<[^>]*>/g, "");
        case "url_encode":
          return encodeURIComponent(toBoundedString(value));
        case "plus":
          return toFiniteNumber(value) + toFiniteNumber(firstArg);
        case "minus":
          return toFiniteNumber(value) - toFiniteNumber(firstArg);
        case "times":
          return toFiniteNumber(value) * toFiniteNumber(firstArg);
        case "divided_by": {
          const divisor = toFiniteNumber(firstArg);
          return divisor === 0 ? 0 : toFiniteNumber(value) / divisor;
        }
        case "modulo": {
          const divisor = toFiniteNumber(firstArg);
          return divisor === 0 ? 0 : toFiniteNumber(value) % divisor;
        }
        case "default":
          return value ?? firstArg;
      }
    } catch {
      return "";
    }
  };
}

export class CustomFilterValidator {
  validateAndCompile(definitionJson: string, _name: string): CustomFilterValidationResult {
    try {
      const definition = parseDeclarativeFilterDefinition(definitionJson);
      return {
        valid: true,
        definition,
        compiledFunction: createDeclarativeFilter(definition),
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  extractSignature(definitionJson: string): string {
    try {
      const definition = parseDeclarativeFilterDefinition(definitionJson);
      return `${definition.operation}(value, ...args)`;
    } catch {
      return "declarative-filter(value, ...args)";
    }
  }
}
