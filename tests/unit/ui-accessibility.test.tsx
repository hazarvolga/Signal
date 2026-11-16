// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../../src/components/ui/Modal";
import { TabBar } from "../../src/components/ui/TabBar";

describe("shared UI accessibility", () => {
  it("exposes modal semantics, focuses the close control and closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="New field">
        <button>Save</button>
      </Modal>
    );

    const dialog = screen.getByRole("dialog", { name: "New field" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("button", { name: "Close dialog" })).toBe(document.activeElement);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("contains keyboard focus and restores it to the trigger when closed", () => {
    function ModalFixture() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open dialog</button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Focus test">
            <button>Save changes</button>
          </Modal>
        </>
      );
    }

    render(<ModalFixture />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole("button", { name: "Close dialog" });
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(close).toBe(document.activeElement);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(save).toBe(document.activeElement);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toBe(document.activeElement);

    fireEvent.click(close);
    expect(trigger).toBe(document.activeElement);
  });

  it("supports selected state and arrow-key navigation for tabs", () => {
    function TabsFixture() {
      const [active, setActive] = useState("overview");
      return (
        <TabBar
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "history", label: "History" },
          ]}
          activeTab={active}
          onChange={setActive}
        />
      );
    }

    render(<TabsFixture />);
    const overview = screen.getByRole("tab", { name: "Overview" });
    const history = screen.getByRole("tab", { name: "History" });

    expect(overview.getAttribute("aria-selected")).toBe("true");
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(history.getAttribute("aria-selected")).toBe("true");
    expect(history).toBe(document.activeElement);
  });
});
