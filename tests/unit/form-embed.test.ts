import { describe, expect, it } from "vitest";
import { buildFormEmbedCode } from "../../src/lib/formEmbed";

describe("buildFormEmbedCode", () => {
  it("builds a constrained iframe using the canonical public form route", () => {
    const code = buildFormEmbedCode({
      id: "form/id",
      name: 'Newsletter <Form> "Primary"',
      origin: "https://signal.example/path",
    });

    expect(code).toContain('src="https://signal.example/f/form%2Fid"');
    expect(code).toContain('title="Newsletter &lt;Form&gt; &quot;Primary&quot;"');
    expect(code).toContain('sandbox="allow-forms allow-scripts allow-same-origin"');
    expect(code).toContain('referrerpolicy="no-referrer"');
    expect(code).not.toContain("<Form>");
  });
});
