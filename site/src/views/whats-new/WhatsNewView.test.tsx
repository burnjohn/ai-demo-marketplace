import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsNewView } from "./WhatsNewView";
import { GettingStartedView } from "../getting-started/GettingStartedView";
import { RouterProvider, useRouter } from "../../routing/router";
import { ToastProvider } from "../../ui/toast";
import { fullFixture } from "../../catalog/fixtures/full";
import { emptyFixture } from "../../catalog/fixtures/empty";
import type { CatalogIndex } from "../../catalog/types";

function renderWhatsNew(index: CatalogIndex) {
  return render(
    <RouterProvider>
      <WhatsNewView index={index} />
    </RouterProvider>,
  );
}

/**
 * Minimal stand-in for the real route table: renders whichever view the
 * router's current state names. Used to prove that activating an internal
 * link actually swaps the rendered view — not merely that `location.hash`
 * changed (see the router's `popstate`-only listener, which real browsers
 * do not fire for a plain fragment navigation; a bare `<a href>` with no
 * `navigate()` call would pass a hash-only assertion while leaving the
 * screen on the old view).
 */
function RoutedApp({ index }: { index: CatalogIndex }) {
  const { route } = useRouter();
  if (route.view === "getting-started") {
    return <GettingStartedView index={index} />;
  }
  return <WhatsNewView index={index} />;
}

function renderRoutedApp(index: CatalogIndex) {
  return render(
    <RouterProvider>
      <ToastProvider>
        <RoutedApp index={index} />
      </ToastProvider>
    </RouterProvider>,
  );
}

function totalChangelogEntries(index: CatalogIndex): number {
  return index.plugins.reduce(
    (sum, plugin) => sum + (plugin.changelogEntries?.length ?? 0),
    0,
  );
}

function resetHash() {
  window.location.hash = "";
}

describe("WhatsNewView", () => {
  afterEach(() => {
    resetHash();
  });

  it("lists every changelog entry newest-first, undated last, and reaches the plugin view by keyboard", async () => {
    const user = userEvent.setup();
    renderWhatsNew(fullFixture);

    const expectedCount = totalChangelogEntries(fullFixture);
    expect(expectedCount).toBeGreaterThan(0);

    const rows = screen.getAllByRole("link", { name: /frontend skills|research tools|sdd workflow/i });
    expect(rows).toHaveLength(expectedCount);

    // Newest-first among dated entries: 2026-07-22 (sdd-workflow 2.0.0) comes
    // before 2026-07-20 (frontend-skills 1.2.0) which comes before
    // 2026-07-10 (research-tools 1.0.3); the undated frontend-skills 1.1.0
    // entry sorts after every dated one and shows no "Invalid Date" text.
    const names = rows.map((row) => row.textContent ?? "");
    const datedOrder = names.filter((name) => !name.includes("undated entry"));
    expect(datedOrder[0]).toContain("2.0.0");
    expect(datedOrder[1]).toContain("1.2.0");
    expect(names[names.length - 1]).toContain("1.1.0");
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();

    // Keyboard activation (Enter, native anchor behaviour) reaches the
    // plugin view.
    const firstRow = rows[0];
    firstRow.focus();
    await user.keyboard("{Enter}");
    expect(window.location.hash).toBe("#/plugin/sdd-workflow");
  });

  it("activates a row with Space and reaches the plugin view", async () => {
    const user = userEvent.setup();
    renderWhatsNew(fullFixture);

    const row = screen.getByRole("link", { name: /research tools/i });
    row.focus();
    await user.keyboard(" ");
    expect(window.location.hash).toBe("#/plugin/research-tools");
  });

  it("the subscribe affordance opens the repository, not a feed file, in an isolated context", () => {
    renderWhatsNew(fullFixture);

    const subscribe = screen.getByRole("link", { name: /repository/i });
    expect(subscribe.textContent ?? "").not.toMatch(/rss|feed|atom/i);
    expect(subscribe.getAttribute("href")).toBe(
      `${fullFixture.repositoryUrl}/releases`,
    );
    expect(subscribe.getAttribute("href")).not.toMatch(/\.(rss|xml|atom)$/i);
    expect(subscribe).toHaveAttribute("target", "_blank");
    expect(subscribe.getAttribute("rel") ?? "").toMatch(/noopener/);
  });

  it("renders the empty state with a route to getting-started when there are no changelog entries at all", async () => {
    const user = userEvent.setup();
    renderWhatsNew(emptyFixture);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /frontend skills|research tools|sdd workflow/i })).not.toBeInTheDocument();

    const gettingStartedLink = screen.getByRole("link", { name: /get started/i });
    await user.click(gettingStartedLink);
    expect(window.location.hash).toBe("#/getting-started");
  });

  it("activating the empty state's getting-started link actually navigates to the getting-started view, not just the hash", async () => {
    const user = userEvent.setup();
    renderRoutedApp(emptyFixture);

    // Still on What's New, showing its empty state.
    expect(screen.getByRole("heading", { name: /what's new/i })).toBeInTheDocument();

    const gettingStartedLink = screen.getByRole("link", { name: /get started/i });
    await user.click(gettingStartedLink);

    expect(window.location.hash).toBe("#/getting-started");
    // The destination view actually rendered — not merely a hash change
    // (see the router's known `popstate`-only listener: a bare `<a href>`
    // with no `navigate()` call would leave the screen on What's New).
    expect(screen.getByRole("heading", { name: /getting started/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /what's new/i })).not.toBeInTheDocument();
  });

  it("the back-to-home control reaches the home view", async () => {
    const user = userEvent.setup();
    renderWhatsNew(fullFixture);

    await user.click(screen.getByRole("link", { name: /back to home/i }));
    expect(window.location.hash).toBe("#/");
  });
});
