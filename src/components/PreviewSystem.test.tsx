// @vitest-environment jsdom

/**
 * Preview System Component Tests
 *
 * Basic tests to verify PreviewSystem component functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { PreviewSystem } from "./PreviewSystem";

vi.mock("./TemplateEditor", () => ({
  TemplateEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Template editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

// Mock TemplateEngine
vi.mock("../services/template/TemplateEngine", () => ({
  TemplateEngine: class {
    render = vi.fn().mockResolvedValue({
      success: true,
      html: "<p>Hello World</p>",
      metrics: {
        parseTime: 5,
        renderTime: 10,
        totalTime: 15,
        cacheHit: false,
      },
    });
  },
}));

describe("PreviewSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<PreviewSystem />);
    expect(screen.getByText("Template Preview System")).toBeTruthy();
  });

  it("displays customer profile selector buttons", () => {
    render(<PreviewSystem />);
    expect(screen.getByText("Premium Customer")).toBeTruthy();
    expect(screen.getByText("Regular Customer")).toBeTruthy();
    expect(screen.getByText("New Customer")).toBeTruthy();
  });

  it("displays custom JSON checkbox", () => {
    render(<PreviewSystem />);
    expect(screen.getByLabelText("Use Custom JSON")).toBeTruthy();
  });

  it("shows custom context textarea when checkbox is enabled", () => {
    render(<PreviewSystem />);
    const checkbox = screen.getByLabelText("Use Custom JSON");
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText('{"user": {"firstName": "John", ...}}')).toBeTruthy();
  });

  it("renders template editor and preview panels side by side", () => {
    render(<PreviewSystem />);
    expect(screen.getByText("Template Editor")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
  });

  it("displays empty state when no template is rendered", () => {
    render(<PreviewSystem />);
    expect(screen.getByText("Start typing to see preview...")).toBeTruthy();
  });

  it("debounces template rendering", async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<PreviewSystem initialTemplate="Hello {{ user.firstName }}" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(container.querySelector("iframe")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("switches between customer profiles", () => {
    render(<PreviewSystem />);

    const premiumButton = screen.getByText("Premium Customer");
    const regularButton = screen.getByText("Regular Customer");

    // Regular is selected by default
    expect(regularButton).toHaveProperty("style.backgroundColor", "rgb(0, 123, 255)");

    // Click premium
    fireEvent.click(premiumButton);
    expect(premiumButton).toHaveProperty("style.backgroundColor", "rgb(0, 123, 255)");
  });

  it("displays profile data in collapsible section", () => {
    render(<PreviewSystem />);
    const details = screen.getByText("View Regular Customer Data");
    expect(details).toBeTruthy();
  });
});
