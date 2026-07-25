import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "../../../routing";
import { ToastProvider } from "../../../ui/toast";
import { fullFixture } from "../../../catalog/fixtures/full";
import { SearchView } from "../SearchView";

function renderSearch(initialHash = "#/search") {
  window.history.pushState({}, "", initialHash);
  return render(
    <RouterProvider>
      <ToastProvider>
        <SearchView index={fullFixture} />
      </ToastProvider>
    </RouterProvider>,
  );
}

function resultCountFromHeading(): number {
  const match = screen.getByText(/result/i, { selector: "p" }).textContent ?? "";
  const parsed = Number.parseInt(match, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
}

describe("SearchView", () => {
  it("renders all entities unfiltered, with the announced count matching the card count", () => {
    renderSearch();

    const cards = screen.getAllByRole("article");
    expect(resultCountFromHeading()).toBe(cards.length);
    // Reset is disabled on a clean view.
    expect(screen.getByRole("button", { name: /^reset filters$/i })).toBeDisabled();
  });

  it("kind facets union: activating two kinds widens the set to the union, not the intersection", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.click(screen.getByRole("button", { name: /^skill\b/i }));
    const skillOnlyCount = screen.getAllByRole("article").length;

    await user.click(screen.getByRole("button", { name: /^agent\b/i }));
    const unionCount = screen.getAllByRole("article").length;

    expect(unionCount).toBeGreaterThan(skillOnlyCount);
    expect(resultCountFromHeading()).toBe(unionCount);

    const skillButton = screen.getByRole("button", { name: /^skill\b/i });
    const agentButton = screen.getByRole("button", { name: /^agent\b/i });
    expect(skillButton).toHaveAttribute("aria-pressed", "true");
    expect(agentButton).toHaveAttribute("aria-pressed", "true");
  });

  it("keyword facets union: activating two keywords widens the result set", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.click(screen.getByRole("button", { name: /^react\b/i }));
    const reactOnlyCount = screen.getAllByRole("article").length;

    await user.click(screen.getByRole("button", { name: /^research\b/i }));
    const widenedCount = screen.getAllByRole("article").length;

    expect(widenedCount).toBeGreaterThan(reactOnlyCount);
  });

  it("author facet is single-valued: activating the same author twice clears it", async () => {
    const user = userEvent.setup();
    renderSearch();

    const baselineCount = screen.getAllByRole("article").length;
    const authorButton = screen.getByRole("button", { name: /^ivan lapa\b/i });

    await user.click(authorButton);
    expect(screen.getByRole("button", { name: /^ivan lapa\b/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: /^ivan lapa\b/i }));
    expect(screen.getByRole("button", { name: /^ivan lapa\b/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getAllByRole("article").length).toBe(baselineCount);
  });

  it("a facet with zero matches under the current query is present but disabled, not hidden", () => {
    renderSearch("#/search?q=react");

    // "react" only matches the frontend-skills plugin's entities; the
    // "workflow" keyword (from an unrelated plugin) matches none of them.
    const impossibleFacet = screen.getByRole("button", { name: /^workflow\b/i });
    expect(impossibleFacet).toBeInTheDocument();
    expect(impossibleFacet).toBeDisabled();

    // A kind with zero matches under this query is disabled too, but stays visible.
    const impossibleKind = screen.getByRole("button", { name: /^command\b/i });
    expect(impossibleKind).toBeInTheDocument();
    expect(impossibleKind).toBeDisabled();
  });

  it("reset clears every filter and the query, and strips the filter parameters from the URL", async () => {
    const user = userEvent.setup();
    renderSearch("#/search?q=react&kind=skill&author=Ivan%20Lapa");

    const filteredCount = screen.getAllByRole("article").length;
    const resetButton = screen.getByRole("button", { name: /^reset filters/i });
    expect(resetButton).toBeEnabled();

    await user.click(resetButton);

    expect(window.location.hash).toBe("#/search");
    const clearedCount = screen.getAllByRole("article").length;
    expect(clearedCount).toBeGreaterThan(filteredCount);
    expect(screen.getByRole("button", { name: /^reset filters$/i })).toBeDisabled();
  });

  it("a nonsense query renders the zero-results state, whose reset action restores the full set", async () => {
    const user = userEvent.setup();
    renderSearch("#/search?q=zzzznonexistentquery");

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: /no results/i })).toBeInTheDocument();
    const statusRegions = screen.getAllByRole("status");
    expect(statusRegions.length).toBeGreaterThan(0);

    const resetButtons = screen.getAllByRole("button", { name: /^reset filters$/i });
    await user.click(resetButtons[0]);

    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
    expect(window.location.hash).toBe("#/search");
  });

  it("keyboard activation of a card (Enter) navigates to the same destination as a click", async () => {
    const user = userEvent.setup();
    renderSearch();

    const cards = screen.getAllByRole("article");
    const firstCard = cards[0];
    const titleLink = within(firstCard).getByRole("link");
    const expectedHref = titleLink.getAttribute("href");
    expect(expectedHref).toBeTruthy();

    fireEvent.keyDown(firstCard, { key: "Enter" });
    const hashAfterKeyboard = window.location.hash;
    expect(`${window.location.pathname}${hashAfterKeyboard}`).toBe(expectedHref);

    // Reset back to the search view and prove a plain click reaches the same place.
    renderSearch();
    const secondCards = screen.getAllByRole("article");
    const secondCard = secondCards[0];
    await user.click(secondCard);
    expect(window.location.hash).toBe(hashAfterKeyboard);
  });
});
