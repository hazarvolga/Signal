// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import PublicForm from "../../src/pages/PublicForm";

const formRecord = {
  id: "form-1",
  name: "Newsletter Signup",
  type: "popup",
  elements: [
    { id: "headline", type: "text", content: "Join our newsletter" },
    { id: "email", type: "input", placeholder: "Email address" },
    { id: "submit", type: "button", content: "Subscribe" },
  ],
  welcomeCampaignId: null,
  leadMagnetUrl: null,
  redirectUrl: null,
};

describe("PublicForm", () => {
  it("renders a hosted form without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => formRecord }))
    );

    render(
      <MemoryRouter>
        <PublicForm formId="form-1" />
      </MemoryRouter>
    );

    expect(await screen.findByLabelText("Newsletter Signup")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email address")).toBeTruthy();
  });
});
