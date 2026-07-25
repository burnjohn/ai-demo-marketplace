import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { fullFixture } from "../catalog/fixtures/full";
import { emptyFixture } from "../catalog/fixtures/empty";
import { corruptEmptyObject } from "../catalog/fixtures/corrupt";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function resetDom() {
  window.location.hash = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-accent");
  document.title = "";
}

describe("App composition", () => {
  beforeEach(() => {
    resetDom();
    vi.stubGlobal("fetch", vi.fn());
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDom();
  });

  it("sets a distinct document title for each of the six views", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));

    window.location.hash = "";
    const home = render(<App />);
    await screen.findByRole("heading", { level: 1, name: /discover plugins for your ai workflow/i });
    expect(document.title).toBe("AI Demo Marketplace");
    home.unmount();
    resetDom();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/search?q=react";
    const search = render(<App />);
    await waitFor(() => expect(document.title).toContain("react"));
    search.unmount();
    resetDom();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/plugin/frontend-skills";
    const plugin = render(<App />);
    await waitFor(() => expect(document.title).toContain("Frontend Skills"));
    plugin.unmount();
    resetDom();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/artifact/frontend-skills--skill--react-best-practices";
    const artifact = render(<App />);
    await waitFor(() => expect(document.title).toContain("React Best Practices"));
    artifact.unmount();
    resetDom();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/whats-new";
    const whatsNew = render(<App />);
    await waitFor(() => expect(document.title).toContain("What's new"));
    whatsNew.unmount();
    resetDom();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/getting-started";
    const gettingStarted = render(<App />);
    await waitFor(() => expect(document.title).toContain("Getting started"));
    gettingStarted.unmount();
  });

  it("moves focus to the new view's main heading when navigating between views", async () => {
    const user = userEvent.setup();
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));

    render(<App />);

    const homeHeading = await screen.findByRole("heading", { level: 1, name: /discover plugins for your ai workflow/i });
    expect(homeHeading).not.toHaveFocus();

    // Navigate home -> whats-new via a real in-app link rendered by the home view.
    const fullFeedLink = screen.getByRole("link", { name: /see all releases|full feed|whats new|what's new/i });
    await user.click(fullFeedLink);

    const whatsNewHeading = await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(whatsNewHeading).toHaveFocus());
    expect(whatsNewHeading).toHaveAttribute("tabindex", "-1");
  });

  it("restores the same search results and scroll offset after Back from a detail view", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));

    // Deliberately does not preset `window.location.hash` before the initial
    // render: jsdom fires a spurious `popstate` shortly after mounting when a
    // non-empty hash is already present at load, which resets the router's
    // `currentKeyRef` to a throwaway key before this test's own scroll offset
    // gets recorded against the real one — a jsdom quirk, not a bug in the
    // composed app. Reaching the search view via a real in-app navigation
    // (the hero searchbox) after mount avoids it entirely.
    const user = userEvent.setup();
    render(<App />);

    // Home renders two mirrored search inputs (the persistent shell header's
    // and the hero's) with identical accessible names by design; either one
    // drives the same navigation, so disambiguate by picking the first.
    await screen.findAllByRole("searchbox");
    const [searchbox] = screen.getAllByRole("searchbox");
    await user.type(searchbox, "react{Enter}");

    await screen.findByRole("link", { name: /react best practices/i });

    // Simulate the user having scrolled the results list.
    Object.defineProperty(window, "scrollY", { value: 320, configurable: true, writable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    const resultLink = screen.getByRole("link", { name: /react best practices/i });
    await act(async () => {
      resultLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await screen.findByRole("heading", { level: 1, name: /react best practices/i });
    expect(window.location.hash).toContain("/artifact/");

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    await waitFor(() => expect(window.location.hash).toBe("#/search?q=react"));
    await screen.findByRole("link", { name: /react best practices/i });
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 320));
  });

  it("renders a distinguishable error surface (with a working retry) for a failed index load, unlike an empty catalog", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(corruptEmptyObject));

    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /nothing here|empty/i })).not.toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(jsonResponse(emptyFixture));
    const retryButton = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryButton);

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    await screen.findByRole("heading", { level: 1, name: /discover plugins for your ai workflow/i });
  });

  it("never shows a fabricated build date while loading or after a failed index load", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<App />);

    // Loading: no build stamp text anywhere, in particular nothing resembling
    // a formatted date (which would only ever be the Unix epoch placeholder
    // if one were fabricated here, since no real timestamp exists yet).
    await waitFor(() => expect(document.querySelector(".app-loading")).toBeInTheDocument());
    expect(screen.queryByText(/built/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();

    resolveFetch(jsonResponse(corruptEmptyObject));
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    // Failed: same — no stamp, no epoch leak, for the entire time the index
    // has never successfully loaded.
    expect(screen.queryByText(/built/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });

  it("keeps the persistent header, with all its controls reachable, during loading and failed states", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<App />);

    // Loading: the shell header and its controls are already present, even
    // though there is no catalog data (and no build stamp) yet. Scoped to
    // the header itself since `ErrorState`'s own repo link (once failed)
    // shares the same accessible name as the shell's.
    const headerDuringLoading = within(document.querySelector(".shell-header") as HTMLElement);
    expect(headerDuringLoading.getByRole("link", { name: /ai demo marketplace/i })).toBeInTheDocument();
    expect(headerDuringLoading.getByRole("searchbox")).toBeInTheDocument();
    expect(headerDuringLoading.getByRole("button", { name: /open command palette/i })).toBeInTheDocument();
    expect(headerDuringLoading.getByRole("button", { name: /switch to (light|dark) theme/i })).toBeInTheDocument();
    expect(headerDuringLoading.getByRole("link", { name: /github/i })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".app-loading")).toBeInTheDocument());

    resolveFetch(jsonResponse(corruptEmptyObject));
    await screen.findByRole("alert");

    // Failed: same set of controls, still reachable.
    const headerAfterFailure = within(document.querySelector(".shell-header") as HTMLElement);
    expect(headerAfterFailure.getByRole("link", { name: /ai demo marketplace/i })).toBeInTheDocument();
    expect(headerAfterFailure.getByRole("searchbox")).toBeInTheDocument();
    expect(headerAfterFailure.getByRole("button", { name: /open command palette/i })).toBeInTheDocument();
    expect(headerAfterFailure.getByRole("button", { name: /switch to (light|dark) theme/i })).toBeInTheDocument();
    expect(headerAfterFailure.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });

  it("renders a not-found state naming what was not found, with routes out to home and search", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));

    window.location.hash = "#/plugin/";
    render(<App />);

    await screen.findByText(/this plugin doesn't exist/i);
    expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse the catalogue/i })).toBeInTheDocument();
  });
});
