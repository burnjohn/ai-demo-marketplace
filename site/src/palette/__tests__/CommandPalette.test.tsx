import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { CommandPalette, type CommandPaletteHandle } from "../CommandPalette";
import { RouterProvider, useRouter } from "../../routing";
import { fullFixture } from "../../catalog/fixtures/full";
import { emptyFixture } from "../../catalog/fixtures/empty";
import type { CatalogIndex } from "../../catalog/types";

function RouteProbe() {
  const { route } = useRouter();
  return <p data-testid="route-probe">{JSON.stringify(route)}</p>;
}

function renderPalette(index: CatalogIndex | null = fullFixture) {
  const ref = createRef<CommandPaletteHandle>();
  render(
    <RouterProvider>
      <button type="button">outside trigger</button>
      <CommandPalette ref={ref} index={index} />
      <RouteProbe />
    </RouterProvider>,
  );
  return ref;
}

function resetDom() {
  window.location.hash = "";
}

/** Flushes the `requestAnimationFrame` the component uses to defer focus. */
async function flushRaf() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  });
}

describe("CommandPalette", () => {
  beforeEach(() => {
    resetDom();
  });

  afterEach(() => {
    resetDom();
  });

  it("opens on Cmd/Ctrl+K, prevents the browser default, and matches the trigger's state", async () => {
    const ref = renderPalette();

    const preventDefault = () => {
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, cancelable: true });
      const spy = event.preventDefault.bind(event);
      let prevented = false;
      event.preventDefault = () => {
        prevented = true;
        spy();
      };
      window.dispatchEvent(event);
      return prevented;
    };

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const wasPrevented = preventDefault();
    expect(wasPrevented).toBe(true);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    await flushRaf();
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("");
    await waitFor(() => expect(input).toHaveFocus());

    // Closing via the shortcut again, then opening via the imperative API
    // (which stands in for the shell's header trigger) should reach the
    // exact same state.
    act(() => ref.current?.close());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => ref.current?.open());
    const reopenedDialog = await screen.findByRole("dialog");
    expect(reopenedDialog).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    await flushRaf();
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveFocus());
  });

  it("traps Tab within the palette, lists at most eight entities on an empty query, and Enter navigates then closes", async () => {
    const ref = renderPalette();
    const user = userEvent.setup();

    act(() => ref.current?.open());
    await screen.findByRole("dialog");
    await flushRaf();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeLessThanOrEqual(8);
    expect(options.length).toBeGreaterThan(0);

    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveFocus());
    await user.tab();
    expect(input).toHaveFocus();
    await user.tab({ shift: true });
    expect(input).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const probe = screen.getByTestId("route-probe");
    expect(probe.textContent).not.toContain('"view":"home"');
  });

  it("arrow keys move the active selection with wrap-around", async () => {
    const ref = renderPalette();
    const user = userEvent.setup();

    act(() => ref.current?.open());
    await screen.findByRole("dialog");
    await flushRaf();

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    const optionsAfterWrap = screen.getAllByRole("option");
    expect(optionsAfterWrap[optionsAfterWrap.length - 1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    const optionsBackToFirst = screen.getAllByRole("option");
    expect(optionsBackToFirst[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Escape closes the palette and restores focus to the element that had it before opening", async () => {
    renderPalette();
    const user = userEvent.setup();

    const trigger = screen.getByRole("button", { name: /outside trigger/i });
    trigger.focus();
    expect(trigger).toHaveFocus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    });
    await screen.findByRole("dialog");
    await flushRaf();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await flushRaf();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows a no-results message for a nonsense query and Enter performs no navigation", async () => {
    const ref = renderPalette();
    const user = userEvent.setup();

    act(() => ref.current?.open());
    await screen.findByRole("dialog");

    await user.type(screen.getByRole("combobox"), "zzzznonexistentqueryzzzz");

    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    await user.keyboard("{Enter}");
    // Still open — Enter was inert because there was nothing to navigate to.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const probe = screen.getByTestId("route-probe");
    expect(probe.textContent).toContain('"view":"home"');
  });

  it("shows the nothing-to-search message for an empty catalog instead of an empty list", async () => {
    const ref = renderPalette(emptyFixture);

    act(() => ref.current?.open());
    await screen.findByRole("dialog");

    expect(screen.getByText(/nothing to search/i)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
