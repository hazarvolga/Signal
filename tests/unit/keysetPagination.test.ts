import { describe, expect, it, vi } from "vitest";
import {
  campaignPageIds,
  contactPageIds,
  restorePageOrder,
} from "../../src/services/keysetPagination";

function queryClient(ids: string[]) {
  return {
    $queryRaw: vi.fn().mockResolvedValue(ids.map((id) => ({ id }))),
  };
}

describe("keyset pagination", () => {
  it("uses a parameterized row-value cursor for contacts", async () => {
    const client = queryClient(["contact-2", "contact-1"]);
    const ids = await contactPageIds(client as never, "org-1", 251, {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "contact-3",
    });

    expect(ids).toEqual(["contact-2", "contact-1"]);
    const query = client.$queryRaw.mock.calls[0][0];
    expect(query.strings.join("?")).toContain('FROM "Contact"');
    expect(query.strings.join("?")).toContain('("createdAt", "id") < (?, ?)');
    expect(query.values).toContain("org-1");
    expect(query.values).toContain("contact-3");
  });

  it("uses the campaign table without interpolating tenant input", async () => {
    const client = queryClient(["campaign-1"]);
    await campaignPageIds(client as never, 'org-1" OR true', 10);

    const query = client.$queryRaw.mock.calls[0][0];
    expect(query.strings.join("?")).toContain('FROM "Campaign"');
    expect(query.strings.join("?")).not.toContain('org-1" OR true');
    expect(query.values).toContain('org-1" OR true');
  });

  it("rejects invalid bounds and cursor dates", async () => {
    const client = queryClient([]);
    await expect(contactPageIds(client as never, "org-1", 252)).rejects.toThrow(RangeError);
    await expect(
      contactPageIds(client as never, "org-1", 10, { createdAt: "invalid", id: "contact-1" })
    ).rejects.toThrow(TypeError);
  });

  it("restores the bounded SQL page order after relation loading", () => {
    expect(
      restorePageOrder(
        ["contact-2", "contact-1", "missing"],
        [
          { id: "contact-1", value: 1 },
          { id: "contact-2", value: 2 },
        ]
      )
    ).toEqual([
      { id: "contact-2", value: 2 },
      { id: "contact-1", value: 1 },
    ]);
  });
});
