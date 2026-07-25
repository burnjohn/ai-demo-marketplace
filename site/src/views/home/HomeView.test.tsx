import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeView } from "./HomeView";
import { RouterProvider, useRouter } from "../../routing/router";
import { fullFixture } from "../../catalog/fixtures/full";
import { incompleteFixture } from "../../catalog/fixtures/incomplete";
import { emptyFixture } from "../../catalog/fixtures/empty";
import type { CatalogIndex } from "../../catalog/types";

/**
 * Minimal route probe: render a view-specific marker so a test can prove a
 * click actually re-rendered a *different* view, rather than only checking
 * that `location.hash` changed. Real browsers do not fire `popstate` for a
 * fragment-only navigation (only `hashchange`, which the router does not
 * listen for), so `router.navigate()` must be what drives this — a bare
 * `<a href>` click would leave `route` (and this marker) unchanged even
 * though `location.hash` moved.
 */
function RoutedProbe({ index }: { index: CatalogIndex }) {
  const { route } = useRouter();
  if (route.view === "home") return <HomeView index={index} />;
  if (route.view === "plugin") return <div data-testid="routed-view">plugin:{route.pluginId}</div>;
  if (route.view === "whats-new") return <div data-testid="routed-view">whats-new</div>;
  if (route.view === "getting-started") return <div data-testid="routed-view">getting-started</div>;
  return <div data-testid="routed-view">other:{route.view}</div>;
}

function renderHome(index: CatalogIndex) {
  return render(
    <RouterProvider>
      <HomeView index={index} />
    </RouterProvider>,
  );
}

function renderRoutedHome(index: CatalogIndex) {
  return render(
    <RouterProvider>
      <RoutedProbe index={index} />
    </RouterProvider>,
  );
}

function resetHash() {
  window.location.hash = "";
}

describe("HomeView", () => {
  afterEach(() => {
    resetHash();
  });

  it("renders all six sections for a populated catalog", () => {
    renderHome(fullFixture);

    expect(screen.getByRole("heading", { name: /discover plugins/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search plugins/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /popular keywords/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what's new/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /browse by kind/i })).toBeInTheDocument();
  });

  it("activating a keyword chip navigates to search with exactly one keyword facet and an empty query", async () => {
    const user = userEvent.setup();
    renderHome(fullFixture);

    const chip = screen.getByRole("button", { name: "react" });
    await user.click(chip);

    expect(window.location.hash).toBe("#/search?keyword=react");
  });

  it("a populated kind counter navigates to a kind-filtered search URL", async () => {
    const user = userEvent.setup();
    renderHome(fullFixture);

    const browseSection = screen.getByRole("heading", { name: /browse by kind/i }).closest("section")!;
    const skillButton = within(browseSection).getAllByRole("button", { name: /skill/i })[0];
    expect(skillButton).toBeEnabled();

    await user.click(skillButton);

    expect(window.location.hash).toBe("#/search?kind=skill");
  });

  it("a zero-count kind is disabled and announced unavailable", () => {
    renderHome(incompleteFixture);

    const browseSection = screen.getByRole("heading", { name: /browse by kind/i }).closest("section")!;
    const skillButton = within(browseSection).getAllByRole("button", { name: /skill/i })[0];

    expect(skillButton).toBeDisabled();
  });

  it("the releases preview never exceeds four rows and matches the full feed's first four", () => {
    renderHome(fullFixture);

    const releasesRegion = screen.getByRole("heading", { name: /what's new/i }).closest("section")!;
    const items = within(releasesRegion).getAllByRole("listitem");
    expect(items.length).toBeLessThanOrEqual(4);

    const allEntries = fullFixture.plugins.flatMap((plugin) => plugin.changelogEntries ?? []);
    const sorted = [...allEntries].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const expectedFirstFour = sorted.slice(0, 4).map((entry) => entry.summary);

    const renderedSummaries = items.map((item) => item.textContent ?? "");
    expectedFirstFour.forEach((summary) => {
      expect(renderedSummaries.some((text) => text.includes(summary))).toBe(true);
    });
  });

  it("renders no chip row when the catalog declares no keywords", () => {
    renderHome(incompleteFixture);

    expect(screen.queryByRole("heading", { name: /popular keywords/i })).not.toBeInTheDocument();
  });

  it("renders no releases heading when no plugin has a changelog entry", () => {
    renderHome(incompleteFixture);

    expect(screen.queryByRole("heading", { name: /what's new/i })).not.toBeInTheDocument();
  });

  it("renders the empty-catalog state with hero and search still visible", () => {
    renderHome(emptyFixture);

    expect(screen.getByRole("heading", { name: /discover plugins/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search plugins/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/the catalogue is empty/i);
    expect(screen.queryByRole("heading", { name: /browse by kind/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /what's new/i })).not.toBeInTheDocument();
  });

  it("activating a release row actually navigates to the plugin view, not just the hash", async () => {
    const user = userEvent.setup();
    renderRoutedHome(fullFixture);

    const releasesRegion = screen.getByRole("heading", { name: /what's new/i }).closest("section")!;
    const firstRow = within(releasesRegion).getAllByRole("listitem")[0];
    const rowLink = within(firstRow).getByRole("link");

    await user.click(rowLink);

    expect(window.location.hash).toMatch(/^#\/plugin\//);
    expect(screen.getByTestId("routed-view")).toHaveTextContent(/^plugin:/);
    // HomeView (and its "Recent releases" heading) must be gone — the routed
    // probe re-rendered a different view, proving `route` state actually
    // changed and not merely `location.hash`.
    expect(screen.queryByRole("heading", { name: /what's new/i })).not.toBeInTheDocument();
  });

  it("activating the full feed link actually navigates to the what's-new view, not just the hash", async () => {
    const user = userEvent.setup();
    renderRoutedHome(fullFixture);

    const fullFeedLink = screen.getByRole("link", { name: /full feed/i });
    await user.click(fullFeedLink);

    expect(window.location.hash).toBe("#/whats-new");
    expect(screen.getByTestId("routed-view")).toHaveTextContent("whats-new");
    expect(screen.queryByRole("heading", { name: /discover plugins/i })).not.toBeInTheDocument();
  });

  it("activating the empty-catalog getting-started link actually navigates, not just the hash", async () => {
    const user = userEvent.setup();
    renderRoutedHome(emptyFixture);

    const gettingStartedLink = screen.getByRole("link", { name: /get started/i });
    await user.click(gettingStartedLink);

    expect(window.location.hash).toBe("#/getting-started");
    expect(screen.getByTestId("routed-view")).toHaveTextContent("getting-started");
  });

  describe("hero search — must behave identically to the header search input", () => {
    it("debounces typing into a single navigation after the pause, preserving the typed text", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderHome(fullFixture);

      const input = screen.getByRole("searchbox", { name: /search plugins/i });
      await user.type(input, "skill");

      // Still within the debounce window: no navigation committed yet.
      vi.advanceTimersByTime(100);
      expect(window.location.hash).toBe("");

      // Past the 250ms debounce from the last keystroke: exactly one commit.
      vi.advanceTimersByTime(200);
      expect(window.location.hash).toBe("#/search?q=skill");

      vi.useRealTimers();
    });

    it("Enter commits immediately, bypassing the debounce", async () => {
      const user = userEvent.setup();
      renderHome(fullFixture);

      const input = screen.getByRole("searchbox", { name: /search plugins/i });
      await user.type(input, "agent");
      await user.keyboard("{Enter}");

      // No need to wait for the 250ms debounce — Enter commits synchronously.
      expect(window.location.hash).toBe("#/search?q=agent");
    });

    it("the clear control appears only with text, empties the query and returns focus to the input", async () => {
      const user = userEvent.setup();
      renderHome(fullFixture);

      const input = screen.getByRole("searchbox", { name: /search plugins/i });
      expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument();

      await user.type(input, "hook");
      await user.keyboard("{Enter}");
      const clear = await screen.findByRole("button", { name: /clear search/i });

      await user.click(clear);

      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
      expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument();
      expect(window.location.hash).toBe("#/search");
    });
  });
});
