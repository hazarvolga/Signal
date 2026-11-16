import { afterEach, describe, expect, it } from "vitest";
import { decodeAndValidateAssetDataUrl } from "../../src/services/objectStorage";

describe("asset binary validation", () => {
  afterEach(() => delete process.env.ASSET_MAX_BYTES);

  it("accepts a PNG only when MIME and magic bytes agree", () => {
    const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
    const result = decodeAndValidateAssetDataUrl(`data:image/png;base64,${png.toString("base64")}`);
    expect(result.mimeType).toBe("image/png");
    expect(result.scanStatus).toBe("VALIDATED");
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects MIME spoofing", () => {
    const pdf = Buffer.from("%PDF-1.7\n", "ascii");
    expect(() =>
      decodeAndValidateAssetDataUrl(`data:image/png;base64,${pdf.toString("base64")}`)
    ).toThrow("does not match");
  });

  it("keeps PDF assets pending until malware scanning exists", () => {
    const pdf = Buffer.from("%PDF-1.7\n", "ascii");
    const result = decodeAndValidateAssetDataUrl(
      `data:application/pdf;base64,${pdf.toString("base64")}`
    );
    expect(result.scanStatus).toBe("PENDING");
  });

  it("rejects decoded payloads above the byte limit", () => {
    process.env.ASSET_MAX_BYTES = "1024";
    const oversized = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(1024)]);
    expect(() =>
      decodeAndValidateAssetDataUrl(`data:image/png;base64,${oversized.toString("base64")}`)
    ).toThrow("byte size");
  });
});
