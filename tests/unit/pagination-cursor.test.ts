import { describe, expect, it } from "vitest";
import { decodeContactCursor, encodeContactCursor } from "../../src/lib/paginationCursor";

describe("contact pagination cursor", () => {
  const secret = "test-pagination-secret-with-at-least-32-characters";
  const payload = {
    organizationId: "org-a",
    createdAt: "2026-08-14T08:00:00.000Z",
    id: "contact-1",
  };

  it("round-trips a signed tenant cursor", () => {
    const cursor = encodeContactCursor(payload, secret);
    expect(decodeContactCursor(cursor, "org-a", secret)).toEqual(payload);
  });

  it("rejects a cursor from another tenant", () => {
    const cursor = encodeContactCursor(payload, secret);
    expect(() => decodeContactCursor(cursor, "org-b", secret)).toThrow("Invalid pagination cursor");
  });

  it("rejects a tampered cursor", () => {
    const cursor = encodeContactCursor(payload, secret);
    const tampered = `${cursor.slice(0, -1)}x`;
    expect(() => decodeContactCursor(tampered, "org-a", secret)).toThrow(
      "Invalid pagination cursor"
    );
  });
});
