import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyControl } from "./CopyControl";
import { ToastProvider, ToastHost } from "../toast";
import { __resetSuccessOwnerForTests } from "./successOwner";

function renderControl(text: string) {
  return render(
    <ToastProvider>
      <ToastHost />
      <CopyControl text={text} />
    </ToastProvider>,
  );
}

function renderTwoControls() {
  return render(
    <ToastProvider>
      <ToastHost />
      <CopyControl text="npm install package-a" />
      <CopyControl text="npm install package-b" />
    </ToastProvider>,
  );
}

describe("CopyControl", () => {
  beforeEach(() => {
    __resetSuccessOwnerForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("copies the exact displayed text, shows success then reverts, keeping focus on the control", async () => {
    // userEvent's own click machinery relies on real setTimeout internally,
    // which fights with fake timers, so this test drives the click with
    // fireEvent (real DOM event, no scheduling of its own) and only fakes
    // time for the component's own 2s success-revert timer.
    vi.useFakeTimers();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderControl("npm install some-package");

    const button = screen.getByRole("button", { name: "Copy" });
    button.focus();
    fireEvent.click(button);
    // Flush the microtask queue so the `await clipboard.writeText(...)`
    // inside handleCopy resolves and the resulting state update commits —
    // fake timers only fake macrotasks (setTimeout), so RTL's findBy/waitFor
    // (which poll via a faked setTimeout) would otherwise never settle.
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("npm install some-package");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveFocus();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("button", { name: "Copy" })).toHaveFocus();
  });

  it("shows a failure message and keeps the command text selectable when the clipboard write is denied", async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderControl("npm install some-package");

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/select the text/i);
    expect(screen.getByText("npm install some-package")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });

  it("shows a failure message when navigator.clipboard is unavailable", async () => {
    const user = userEvent.setup();

    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    renderControl("npm install some-package");

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });

  it("resets a previously succeeded control's success state when another control is copied", async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderTwoControls();

    const [buttonA, buttonB] = screen.getAllByRole("button");

    await user.click(buttonA);
    expect(await screen.findByRole("button", { name: "Copied" })).toBe(buttonA);

    await user.click(buttonB);

    expect(await screen.findByRole("button", { name: "Copied" })).toBe(buttonB);
    expect(buttonA).toHaveTextContent("Copy");
  });
});
