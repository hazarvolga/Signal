import { describe, expect, it } from "vitest";
import {
  deterministicBucket,
  evaluateABWinner,
  selectDeterministicVariation,
  selectVariationForBucket,
} from "../../src/services/email/abTesting";

const variations = [
  { id: "variation-a", weight: 1 },
  { id: "variation-b", weight: 3 },
];

describe("A/B delivery allocation", () => {
  it("assigns the same campaign/contact pair deterministically", () => {
    const bucket = deterministicBucket("campaign-1", "contact-1");
    const assignments = Array.from({ length: 10 }, () =>
      selectDeterministicVariation("campaign-1", "contact-1", variations).id
    );

    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(1);
    expect(new Set(assignments)).toEqual(
      new Set([selectVariationForBucket(bucket, variations).id])
    );
  });

  it("honors normalized weight boundaries exactly", () => {
    expect(selectVariationForBucket(0.249999, variations).id).toBe("variation-a");
    expect(selectVariationForBucket(0.25, variations).id).toBe("variation-b");
    expect(selectVariationForBucket(0.999999, variations).id).toBe("variation-b");
  });
});

describe("A/B winner evaluation", () => {
  const base = {
    sentAt: new Date("2026-07-29T10:00:00.000Z"),
    testDurationHours: 1,
    winnerCriteria: "OPEN_RATE" as const,
    variations,
    now: new Date("2026-07-29T12:00:00.000Z"),
  };

  it("fails closed when every variation has not reached the sample floor", () => {
    const result = evaluateABWinner({
      ...base,
      minimumSamplePerVariation: 2,
      events: [
        { type: "ACCEPTED", variationId: "variation-a", contactId: "a1" },
        { type: "ACCEPTED", variationId: "variation-b", contactId: "b1" },
        { type: "DELIVERED", variationId: "variation-b", contactId: "b2" },
        { type: "OPEN", variationId: "variation-a", contactId: "a1" },
      ],
    });

    expect(result).toMatchObject({
      selected: false,
      reason: "INSUFFICIENT_SAMPLE",
    });
  });

  it("selects the sole highest real-event rate after the test window", () => {
    const result = evaluateABWinner({
      ...base,
      minimumSamplePerVariation: 3,
      events: [
        { type: "ACCEPTED", variationId: "variation-a", contactId: "a1" },
        { type: "ACCEPTED", variationId: "variation-a", contactId: "a2" },
        { type: "DELIVERED", variationId: "variation-a", contactId: "a3" },
        { type: "OPEN", variationId: "variation-a", contactId: "a1" },
        { type: "OPEN", variationId: "variation-a", contactId: "a2" },
        { type: "ACCEPTED", variationId: "variation-b", contactId: "b1" },
        { type: "ACCEPTED", variationId: "variation-b", contactId: "b2" },
        { type: "DELIVERED", variationId: "variation-b", contactId: "b3" },
        { type: "OPEN", variationId: "variation-b", contactId: "b1" },
        // An OPEN without a real accepted/delivered recipient cannot inflate the rate.
        { type: "OPEN", variationId: "variation-b", contactId: "not-accepted" },
        { type: "SENT", variationId: "variation-b", contactId: "simulated" },
      ],
    });

    expect(result).toMatchObject({
      selected: true,
      winnerId: "variation-a",
    });
    if (result.selected) {
      expect(result.metrics).toEqual([
        {
          variationId: "variation-a",
          accepted: 3,
          opens: 2,
          clicks: 0,
          rate: 2 / 3,
        },
        {
          variationId: "variation-b",
          accepted: 3,
          opens: 2,
          clicks: 0,
          rate: 1 / 3,
        },
      ]);
    }
  });
});
