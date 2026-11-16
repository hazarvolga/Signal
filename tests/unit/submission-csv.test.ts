import { describe, expect, it } from "vitest";
import { buildSubmissionCsv } from "../../src/lib/submissionCsv";

describe("buildSubmissionCsv", () => {
  it("escapes formulas, quotes and dynamic columns", () => {
    const csv = buildSubmissionCsv([
      {
        id: "sub-1",
        createdAt: "2026-08-20T12:00:00.000Z",
        payload: { email: "user@example.com", name: '=HYPERLINK("bad")' },
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"email","name"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).not.toContain(',=HYPERLINK');
  });
});
