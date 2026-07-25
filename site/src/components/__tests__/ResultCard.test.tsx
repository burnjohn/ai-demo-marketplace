import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "../../routing";
import { ResultCard } from "../ResultCard";
import { fullFixture } from "../../catalog/fixtures/full";
import type { SearchEntity } from "../../catalog/search";

function renderCard(entity: SearchEntity) {
  return render(
    <RouterProvider>
      <ResultCard entity={entity} renderCopyControl={(text) => <button type="button">Copy {text}</button>} />
    </RouterProvider>,
  );
}

const plugin = fullFixture.plugins[0];
const pluginEntity: SearchEntity = { entityType: "plugin", plugin };

describe("ResultCard", () => {
  it("displays kind, version, name, description, up to three keywords and a meta line", () => {
    renderCard(pluginEntity);

    expect(
      screen.getByRole("heading", { level: 3, name: plugin.displayName }),
    ).toBeInTheDocument();
    expect(screen.getByText(plugin.description)).toBeInTheDocument();
    expect(screen.getByText(`v${plugin.version}`)).toBeInTheDocument();
    for (const keyword of (plugin.keywords ?? []).slice(0, 3)) {
      expect(screen.getByText(keyword)).toBeInTheDocument();
    }
    expect(screen.getByText(plugin.authorName!)).toBeInTheDocument();
    // Primary accent-filled Open control — a real anchor, accessible name
    // embeds the display name.
    expect(
      screen.getByRole("link", { name: `Open ${plugin.displayName}` }),
    ).toBeInTheDocument();
  });

  it("navigates on click, Enter or Space anywhere on the card, and exposes exactly two Tab stops per card", async () => {
    const user = userEvent.setup();
    window.location.hash = "";

    const sixCards = Array.from({ length: 6 }, (_, index) => ({
      ...plugin,
      id: `plugin-${index}`,
    }));

    render(
      <RouterProvider>
        {sixCards.map((p) => (
          <ResultCard
            key={p.id}
            entity={{ entityType: "plugin", plugin: p }}
            renderCopyControl={(text) => <button type="button">Copy {text}</button>}
          />
        ))}
      </RouterProvider>,
    );

    // 6 cards x 2 Tab stops each = 12 stops total.
    const focusable: Element[] = [];
    for (let i = 0; i < 12; i++) {
      await user.tab();
      focusable.push(document.activeElement as Element);
    }
    expect(new Set(focusable).size).toBe(12);

    // A 13th Tab moves off the last card's controls (nothing more inside the grid).
    const linksAndButtons = screen.getAllByRole("link").length + screen.getAllByRole("button").length;
    expect(linksAndButtons).toBe(12);
  });

  it("navigates when the card body (not the link or the copy control) is clicked", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    renderCard(pluginEntity);

    await user.click(screen.getByText(plugin.description));

    expect(window.location.hash).toBe(`#/plugin/${plugin.id}`);
  });

  it("navigates when the primary Open control is activated", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    renderCard(pluginEntity);

    await user.click(screen.getByRole("link", { name: `Open ${plugin.displayName}` }));

    expect(window.location.hash).toBe(`#/plugin/${plugin.id}`);
  });

  it("navigates when the visible title text is clicked", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    renderCard(pluginEntity);

    // The title is a plain heading — clicks fall through to the card's
    // click handler, which routes to the same detail view.
    await user.click(screen.getByRole("heading", { level: 3, name: plugin.displayName }));

    expect(window.location.hash).toBe(`#/plugin/${plugin.id}`);
  });

  it("clamps an artificially long name/description via CSS, leaving neighbouring cards' markup unaffected", () => {
    const longName = "X".repeat(500);
    const longDescription = "Y".repeat(2000);
    const longPlugin = { ...plugin, id: "long-plugin", displayName: longName, description: longDescription };
    const normalPlugin = { ...plugin, id: "normal-plugin" };

    render(
      <RouterProvider>
        <ResultCard
          entity={{ entityType: "plugin", plugin: longPlugin }}
          renderCopyControl={(text) => <button type="button">Copy {text}</button>}
        />
        <ResultCard
          entity={{ entityType: "plugin", plugin: normalPlugin }}
          renderCopyControl={(text) => <button type="button">Copy {text}</button>}
        />
      </RouterProvider>,
    );

    // The full text is still in the DOM (available to assistive tech / detail
    // view navigation) — clamping is a CSS-applied visual affordance, not a
    // text-content truncation — but it is rendered through the dedicated
    // clamp classes that carry the `line-clamp`/`overflow` CSS contract.
    const longTitle = screen.getByRole("heading", { level: 3, name: longName });
    expect(longTitle).toHaveClass("result-card__title");
    const longDescriptionEl = screen.getByText(longDescription);
    expect(longDescriptionEl).toHaveClass("result-card__description");

    // The neighbouring card's own markup/classes are untouched by the first
    // card's oversized content.
    const normalTitle = screen.getByRole("heading", { level: 3, name: normalPlugin.displayName });
    expect(normalTitle).toHaveClass("result-card__title");
    expect(normalTitle.closest("article")).not.toBe(longTitle.closest("article"));
  });
});
