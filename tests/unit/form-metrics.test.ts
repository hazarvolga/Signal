import { describe, expect, it } from "vitest";
import { calculateConversionRate } from "../../src/lib/formMetrics";

describe("calculateConversionRate", () => {
  it("returns zero when no measurable conversion exists", () => {
    expect(calculateConversionRate(0, 4)).toBe(0);
    expect(calculateConversionRate(10, 0)).toBe(0);
  });

  it("returns a percentage rounded to two decimals", () => {
    expect(calculateConversionRate(3, 1)).toBe(33.33);
    expect(calculateConversionRate(8, 2)).toBe(25);
  });
});
