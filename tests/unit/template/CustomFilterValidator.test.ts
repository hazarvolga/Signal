import { describe, expect, it } from "vitest";
import {
  CustomFilterValidator,
  parseDeclarativeFilterDefinition,
} from "../../../src/services/template/CustomFilterValidator";

describe("CustomFilterValidator", () => {
  const validator = new CustomFilterValidator();

  it("compiles an allowlisted declarative operation", () => {
    const result = validator.validateAndCompile(
      JSON.stringify({ operation: "uppercase" }),
      "uppercase"
    );

    expect(result.valid).toBe(true);
    expect(result.compiledFunction?.("hello")).toBe("HELLO");
  });

  it("supports configured primitive arguments", () => {
    const result = validator.validateAndCompile(
      JSON.stringify({ operation: "prefix", args: ["org-"] }),
      "organization_prefix"
    );

    expect(result.valid).toBe(true);
    expect(result.compiledFunction?.("customer")).toBe("org-customer");
  });

  it("allows bounded runtime arguments for safe operations", () => {
    const result = validator.validateAndCompile(JSON.stringify({ operation: "times" }), "multiply");

    expect(result.compiledFunction?.(5, 3)).toBe(15);
  });

  it("does not coerce object runtime arguments", () => {
    const result = validator.validateAndCompile(JSON.stringify({ operation: "prefix" }), "prefix");
    const attackerControlled = {
      toString: () => {
        throw new Error("must not execute");
      },
    };

    expect(result.compiledFunction?.("customer", attackerControlled)).toBe("");
  });

  it("preserves built-in-compatible safe transformations", () => {
    const cases = [
      [{ operation: "downcase" }, "HELLO", [], "hello"],
      [{ operation: "capitalize" }, "hello", [], "Hello"],
      [{ operation: "truncate", args: [5] }, "Hello World", [], "Hello..."],
      [{ operation: "strip_html" }, "<p>Hello</p>", [], "Hello"],
      [{ operation: "divided_by", args: [2] }, 10, [], 5],
      [{ operation: "default", args: ["N/A"] }, null, [], "N/A"],
    ] as const;

    for (const [definition, value, args, expected] of cases) {
      const result = validator.validateAndCompile(JSON.stringify(definition), "safe_filter");
      expect(result.valid).toBe(true);
      expect(result.compiledFunction?.(value, ...args)).toBe(expected);
    }
  });

  it("rejects empty or malformed definitions", () => {
    expect(validator.validateAndCompile("", "empty").valid).toBe(false);
    expect(validator.validateAndCompile("not-json", "invalid").error).toContain("valid JSON");
  });

  it("rejects every executable JavaScript form instead of scanning it", () => {
    const executableInputs = [
      "(value) => value.toUpperCase()",
      "function(value) { return value; }",
      'require("fs")',
      'eval("1 + 1")',
      'new Function("return process")()',
      'import("node:fs")',
    ];

    for (const input of executableInputs) {
      const result = validator.validateAndCompile(input, "malicious");
      expect(result.valid).toBe(false);
      expect(result.compiledFunction).toBeUndefined();
    }
  });

  it("rejects unknown operations and unsupported fields", () => {
    expect(
      validator.validateAndCompile(
        JSON.stringify({ operation: "execute", command: "whoami" }),
        "invalid"
      ).valid
    ).toBe(false);
    expect(
      validator.validateAndCompile(
        JSON.stringify({ operation: "uppercase", source: "process.env" }),
        "invalid"
      ).valid
    ).toBe(false);
  });

  it("rejects object arguments, oversized strings and too many args", () => {
    const invalidDefinitions = [
      { operation: "prefix", args: [{ nested: true }] },
      { operation: "prefix", args: ["x".repeat(1_001)] },
      { operation: "plus", args: Array.from({ length: 9 }, () => 1) },
    ];

    for (const definition of invalidDefinitions) {
      expect(validator.validateAndCompile(JSON.stringify(definition), "invalid").valid).toBe(false);
    }
  });

  it("extracts declarative metadata without exposing source", () => {
    expect(validator.extractSignature(JSON.stringify({ operation: "truncate", args: [10] }))).toBe(
      "truncate(value, ...args)"
    );
    expect(validator.extractSignature("not-json")).toBe("declarative-filter(value, ...args)");
  });

  it("returns an exact definition made only from allowed fields", () => {
    expect(
      parseDeclarativeFilterDefinition(JSON.stringify({ operation: "suffix", args: ["!"] }))
    ).toEqual({ operation: "suffix", args: ["!"] });
  });
});
