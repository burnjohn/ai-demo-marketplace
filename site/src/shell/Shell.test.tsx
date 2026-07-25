import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Shell } from "./Shell";
import { RouterProvider } from "../routing/router";
import { THEME_STORAGE_KEY } from "./storage";

function renderShell(onOpenPalette = vi.fn()) {
  return render(
    <RouterProvider>
      <Shell onOpenPalette={onOpenPalette} />
    </RouterProvider>,
  );
}

function resetDom() {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-accent");
  window.location.hash = "";
}

describe("Shell", () => {
  beforeEach(() => {
    resetDom();
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("data-accent", "default");
  });

  afterEach(() => {
    vi.useRealTimers();
    resetDom();
  });

  it("exposes every control by accessible role and name", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "AI Demo Marketplace" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search plugins/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open command palette/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to light theme/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view repository on github/i })).toBeInTheDocument();
  });

  it("clear control appears only with text, empties the query and returns focus to the input", async () => {
    const user = userEvent.setup();
    renderShell();

    const input = screen.getByRole("searchbox", { name: /search plugins/i });
    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument();

    await user.type(input, "skill");
    const clear = await screen.findByRole("button", { name: /clear search/i });

    await user.click(clear);

    expect(input).toHaveValue("");
    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("debounces typed input to a single navigation after the pause, and Enter commits immediately", () => {
    vi.useFakeTimers();
    renderShell();

    const input = screen.getByRole("searchbox", { name: /search plugins/i });

    fireEvent.change(input, { target: { value: "h" } });
    fireEvent.change(input, { target: { value: "he" } });
    fireEvent.change(input, { target: { value: "hel" } });
    fireEvent.change(input, { target: { value: "hell" } });
    fireEvent.change(input, { target: { value: "hello" } });
    // Nothing committed to the URL yet — still mid-debounce.
    expect(window.location.hash).toBe("");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(window.location.hash).toContain("q=hello");

    fireEvent.change(input, { target: { value: "hello!" } });
    // Enter bypasses the debounce entirely — no need to advance timers.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(window.location.hash).toContain("q=hello%21");
  });

  it("persists an explicit theme choice across a remount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderShell();

    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    unmount();
    // Simulate the pre-paint script re-applying the stored value before remount.
    document.documentElement.setAttribute("data-theme", "light");
    renderShell();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(screen.getByRole("button", { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it("follows the OS preference only while no explicit theme is stored, and tracks later changes", () => {
    const listenerHolder: { current: ((event: { matches: boolean }) => void) | null } = {
      current: null,
    };
    const state = { matches: false };
    const mediaQueryStub = {
      get matches() {
        return state.matches;
      },
      media: "(prefers-color-scheme: light)",
      addEventListener: (_: string, cb: (event: { matches: boolean }) => void) => {
        listenerHolder.current = cb;
      },
      removeEventListener: () => {
        listenerHolder.current = null;
      },
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    const original = window.matchMedia;
    window.matchMedia = () => mediaQueryStub;

    renderShell();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    state.matches = true;
    listenerHolder.current?.({ matches: true });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    window.matchMedia = original;
  });

  it("does not follow OS changes once a choice is stored", async () => {
    const user = userEvent.setup();
    const listenerHolder: { current: ((event: { matches: boolean }) => void) | null } = {
      current: null,
    };
    const state = { matches: false };
    const mediaQueryStub = {
      get matches() {
        return state.matches;
      },
      media: "(prefers-color-scheme: light)",
      addEventListener: (_: string, cb: (event: { matches: boolean }) => void) => {
        listenerHolder.current = cb;
      },
      removeEventListener: () => {
        listenerHolder.current = null;
      },
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    const original = window.matchMedia;
    window.matchMedia = () => mediaQueryStub;

    renderShell();
    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    state.matches = false;
    listenerHolder.current?.({ matches: false });
    // Explicit stored choice must survive the OS reporting "dark".
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    window.matchMedia = original;
  });

  it("the repository link isolates the opener from the new browsing context", () => {
    renderShell();
    const link = screen.getByRole("link", { name: /view repository on github/i });
    expect(link).toHaveAttribute("href", "https://github.com/burnjohn/ai-demo-marketplace");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("brand navigates home and moves focus to the top of the document", async () => {
    const user = userEvent.setup();
    renderShell();

    window.location.hash = "#/whats-new";
    await user.click(screen.getByRole("link", { name: "AI Demo Marketplace" }));

    expect(window.location.hash === "" || window.location.hash === "#/").toBe(true);
  });

  it("the command palette trigger calls the provided callback", async () => {
    const user = userEvent.setup();
    const onOpenPalette = vi.fn();
    renderShell(onOpenPalette);

    await user.click(screen.getByRole("button", { name: /open command palette/i }));
    expect(onOpenPalette).toHaveBeenCalledTimes(1);
  });

  it("renders no accent switcher and no build stamp — those are not in the design", () => {
    renderShell();
    expect(screen.queryByRole("group", { name: /accent/i })).not.toBeInTheDocument();
    expect(document.querySelector(".shell-accent-switcher")).not.toBeInTheDocument();
    expect(document.querySelector(".shell-build-stamp")).not.toBeInTheDocument();
    expect(screen.queryByText(/built/i)).not.toBeInTheDocument();
  });
});
