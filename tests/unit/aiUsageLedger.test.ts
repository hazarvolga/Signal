import { describe, expect, it } from "vitest";
import { calculateAiCostMicros, parseUsdToMicros } from "../../src/services/aiUsageLedger";

describe("AI usage pricing", () => {
  it("parses USD budgets without floating-point drift", () => {
    expect(parseUsdToMicros("25.50")).toBe(25_500_000n);
    expect(parseUsdToMicros("0.000001")).toBe(1n);
    expect(() => parseUsdToMicros("-1")).toThrow();
    expect(() => parseUsdToMicros("1.0000001")).toThrow();
  });

  it("calculates Gemini 3 Flash text cost in micro-dollars", () => {
    expect(
      calculateAiCostMicros(
        "gemini-3-flash-preview",
        { promptTokenCount: 1_000, candidatesTokenCount: 500 },
        0,
        {}
      )
    ).toBe(2_000n);
  });

  it("calculates Gemini 2.5 Flash Image input and image cost", () => {
    expect(
      calculateAiCostMicros("gemini-2.5-flash-image", { promptTokenCount: 1_000 }, 1, {})
    ).toBe(39_300n);
  });
});
