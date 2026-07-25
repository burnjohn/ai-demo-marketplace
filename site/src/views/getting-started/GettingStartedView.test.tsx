import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GettingStartedView } from "./GettingStartedView";
import { ToastProvider, ToastHost } from "../../ui/toast";
import { RouterProvider } from "../../routing/router";
import { fullFixture } from "../../catalog/fixtures/full";
import type { CatalogIndex } from "../../catalog/types";

function renderGettingStarted(index: CatalogIndex) {
  return render(
    <RouterProvider>
      <ToastProvider>
        <ToastHost />
        <GettingStartedView index={index} />
      </ToastProvider>
    </RouterProvider>,
  );
}

describe("GettingStartedView", () => {
  it("shows an ordered sequence of three numbered steps, each with a title, a command and its own copy control", () => {
    renderGettingStarted(fullFixture);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(3);

    steps.forEach((step, i) => {
      expect(step.textContent).toContain(String(i + 1));
    });

    expect(screen.getByRole("heading", { level: 2, name: /add the marketplace/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /install a plugin/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /keep things up to date/i })).toBeInTheDocument();

    // Every command is a literal command generated from the catalog's own
    // identity (marketplace name + a real plugin name), not hard-coded.
    expect(screen.getByText(`/plugin marketplace add ${fullFixture.marketplaceName}`)).toBeInTheDocument();
    expect(
      screen.getByText(`/plugin install ${fullFixture.plugins[0].name}@${fullFixture.marketplaceName}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`/plugin update ${fullFixture.plugins[0].name}@${fullFixture.marketplaceName}`),
    ).toBeInTheDocument();

    // Three copy controls, one per step.
    expect(screen.getAllByRole("button", { name: /copy/i })).toHaveLength(3);

    // The note distinguishing "update the marketplace source" from "update
    // an installed plugin".
    expect(
      screen.getByText(/does not update plugins you have already installed/i),
    ).toBeInTheDocument();
  });

  it("copying step 2 places only step 2's command on the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText, readText: vi.fn() },
      configurable: true,
    });

    renderGettingStarted(fullFixture);

    const copyButtons = screen.getAllByRole("button", { name: /copy/i });
    expect(copyButtons).toHaveLength(3);

    // jsdom lays out every element at (0,0) with a zero-size rect, which
    // defeats `userEvent`'s elementFromPoint-based visibility check when
    // multiple identical controls are on the page; a plain DOM click event
    // (`fireEvent`) exercises the same `onClick` handler without that check.
    fireEvent.click(copyButtons[1]);
    await screen.findByRole("button", { name: /copied/i });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(
      `/plugin install ${fullFixture.plugins[0].name}@${fullFixture.marketplaceName}`,
    );
  });

  it("renaming the marketplace changes every displayed command", () => {
    const renamed: CatalogIndex = {
      ...fullFixture,
      marketplaceName: "renamed-marketplace",
    };
    renderGettingStarted(renamed);

    expect(screen.getByText(`/plugin marketplace add renamed-marketplace`)).toBeInTheDocument();
    expect(
      screen.getByText(`/plugin install ${renamed.plugins[0].name}@renamed-marketplace`),
    ).toBeInTheDocument();
    expect(screen.queryByText(`/plugin marketplace add ${fullFixture.marketplaceName}`)).not.toBeInTheDocument();
  });
});
