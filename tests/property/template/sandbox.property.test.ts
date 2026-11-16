import { beforeEach, describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { SandboxExecutor } from "../../../src/services/template/SandboxExecutor";
import type { SandboxLimits } from "../../../src/services/template/types";

describe("SandboxExecutor - Property Tests", () => {
  let executor: SandboxExecutor;
  const limits: SandboxLimits = {
    timeout: 5_000,
    maxMemory: 50 * 1024 * 1024,
    maxLoopIterations: 1_000,
  };

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it("rejects executable JavaScript families without running them", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 60 }),
        fc.constantFrom("require(", "eval(", "Function(", "process.", "global.", "import("),
        async (prefix, executableToken) => {
          const source = `${prefix}${executableToken}"payload")`;
          await expect(executor.execute(source, { value: "test" }, limits)).rejects.toThrow(
            /SECURITY_ERROR/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("preserves uppercase behavior for arbitrary strings", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (value) => {
        const result = await executor.execute(
          JSON.stringify({ operation: "uppercase" }),
          { value },
          limits
        );
        expect(result).toBe(value.toUpperCase());
      }),
      { numRuns: 100 }
    );
  });

  it("preserves numeric addition for finite integers", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer(), fc.integer(), async (value, amount) => {
        const result = await executor.execute(
          JSON.stringify({ operation: "plus", args: [amount] }),
          { value },
          limits
        );
        expect(Number(result)).toBe(value + amount);
      }),
      { numRuns: 100 }
    );
  });

  it("preserves prefix behavior for bounded arbitrary strings", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 200 }),
        fc.string({ maxLength: 200 }),
        async (prefix, value) => {
          const result = await executor.execute(
            JSON.stringify({ operation: "prefix", args: [prefix] }),
            { value },
            limits
          );
          expect(result).toBe(`${prefix}${value}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any non-allowlisted operation name", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 40 })
          .filter(
            (operation) =>
              ![
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
              ].includes(operation)
          ),
        async (operation) => {
          await expect(
            executor.execute(JSON.stringify({ operation }), { value: "test" }, limits)
          ).rejects.toThrow(/SECURITY_ERROR/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
