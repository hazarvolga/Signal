// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import SignalLanding from "../../src/pages/SignalLanding";

describe("SignalLanding", () => {
  it("presents the public product story without tenant-specific demo content", () => {
    render(
      <MemoryRouter>
        <SignalLanding />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Campaigns, audiences and automations/i,
      })
    ).toBeTruthy();
    expect(screen.getByText(/Controlled technical pilot/i)).toBeTruthy();
    for (const capability of ["Broadcast", "Audience", "Journeys"]) {
      expect(screen.getByRole("heading", { name: capability })).toBeTruthy();
    }
    expect(screen.queryByRole("form", { name: /Email sign in/i })).toBeNull();
    expect(screen.queryByText(/ALLPLAN/i)).toBeNull();
    expect(screen.queryByText(/production-ready|GDPR compliant|KVKK compliant/i)).toBeNull();
  });

  it("offers an accessible workspace entry and source link", () => {
    render(
      <MemoryRouter>
        <SignalLanding />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Enter workspace/i }).getAttribute("href")).toBe(
      "/login"
    );
    expect(screen.getByRole("link", { name: /View source/i }).getAttribute("href")).toBe(
      "https://github.com/hazarvolga/Signal"
    );
    expect(screen.getByRole("navigation", { name: /Public navigation/i })).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });
});
