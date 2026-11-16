import { beforeEach, describe, expect, it } from "vitest";
import { SandboxExecutor } from "../../../src/services/template/SandboxExecutor";
import type { SandboxLimits } from "../../../src/services/template/types";

describe("SandboxExecutor", () => {
  let executor: SandboxExecutor;
  const limits: SandboxLimits = {
    timeout: 5_000,
    maxMemory: 50 * 1024 * 1024,
    maxLoopIterations: 1_000,
  };

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it("executes only an allowlisted declarative operation", async () => {
    await expect(
      executor.execute(JSON.stringify({ operation: "uppercase" }), { value: "hello" }, limits)
    ).resolves.toBe("HELLO");
  });

  it("supports configured arguments", async () => {
    await expect(
      executor.execute(
        JSON.stringify({ operation: "prefix", args: ["customer-"] }),
        { value: "42" },
        limits
      )
    ).resolves.toBe("customer-42");
  });

  it("uses bounded runtime arguments when explicitly supplied", async () => {
    await expect(
      executor.execute(
        JSON.stringify({ operation: "times", args: [99] }),
        { value: 6, args: [7] },
        limits
      )
    ).resolves.toBe("42");
  });

  it.each([
    "(value) => value.toUpperCase()",
    'require("node:fs")',
    'eval("1 + 1")',
    'new Function("return process")()',
    'import("node:fs")',
    "while (true) {}",
  ])("rejects executable input without evaluating it: %s", async (source) => {
    await expect(executor.execute(source, { value: "test" }, limits)).rejects.toThrow(
      /SECURITY_ERROR/
    );
  });

  it("rejects unknown operations and additional source-like fields", async () => {
    await expect(
      executor.execute(JSON.stringify({ operation: "execute" }), { value: "test" }, limits)
    ).rejects.toThrow(/SECURITY_ERROR/);

    await expect(
      executor.execute(
        JSON.stringify({ operation: "uppercase", source: "process.env" }),
        { value: "test" },
        limits
      )
    ).rejects.toThrow(/SECURITY_ERROR/);
  });

  it("validates declarative definitions without accepting safe-looking JavaScript", () => {
    expect(() => executor.validateCode(JSON.stringify({ operation: "trim" }))).not.toThrow();
    expect(() => executor.validateCode("Math.max(1, 2, 3)")).toThrow(/SECURITY_ERROR/);
  });

  it.each([
    { timeout: 0, maxMemory: 1, maxLoopIterations: 1 },
    { timeout: 1, maxMemory: Number.POSITIVE_INFINITY, maxLoopIterations: 1 },
    { timeout: 1, maxMemory: 1, maxLoopIterations: -1 },
  ])("rejects invalid resource-limit contracts", async (invalidLimits) => {
    await expect(
      executor.execute(
        JSON.stringify({ operation: "uppercase" }),
        { value: "hello" },
        invalidLimits
      )
    ).rejects.toThrow(/SECURITY_ERROR/);
  });

  it("rejects deeply nested context before processing it", async () => {
    let value: unknown = "leaf";
    for (let depth = 0; depth < 10; depth += 1) {
      value = { nested: value };
    }

    await expect(
      executor.execute(JSON.stringify({ operation: "default" }), { value }, limits)
    ).rejects.toThrow(/Context nesting limit exceeded/);
  });
});
