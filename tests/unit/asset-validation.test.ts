import { describe, expect, it } from "vitest";
import { AssetCreateSchema, EngagementEventSchema } from "../../src/lib/schemas";

describe("asset and engagement validation", () => {
  it("accepts a bounded image data URL", () => {
    expect(
      AssetCreateSchema.safeParse({
        name: "hero.png",
        type: "IMAGE",
        url: "data:image/png;base64,aGVsbG8=",
        metadata: { size: 5 },
      }).success
    ).toBe(true);
  });

  it("rejects remote URLs and executable data URLs", () => {
    expect(
      AssetCreateSchema.safeParse({
        name: "remote",
        type: "IMAGE",
        url: "https://example.com/x.png",
      }).success
    ).toBe(false);
    expect(
      AssetCreateSchema.safeParse({
        name: "payload.svg",
        type: "IMAGE",
        url: "data:image/svg+xml;base64,PHNjcmlwdD4=",
      }).success
    ).toBe(false);
  });

  it("rejects oversized inline assets", () => {
    const oversized = `data:image/png;base64,${"a".repeat(7_000_001)}`;

    expect(
      AssetCreateSchema.safeParse({ name: "huge.png", type: "IMAGE", url: oversized }).success
    ).toBe(false);
  });

  it("coerces bounded engagement values and rejects non-numeric values", () => {
    const valid = EngagementEventSchema.safeParse({
      campaignId: "cm12345678901234567890123",
      type: "read_time",
      value: "12.5",
    });

    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.value).toBe(12.5);
    expect(
      EngagementEventSchema.safeParse({
        campaignId: "cm12345678901234567890123",
        type: "read_time",
        value: "not-a-number",
      }).success
    ).toBe(false);
  });
});
