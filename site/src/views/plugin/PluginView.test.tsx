import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PluginView } from "./PluginView";
import { __resetBackProvenanceForTests } from "./backProvenance";
import { RouterProvider, useRouter } from "../../routing/router";
import { ToastProvider, ToastHost } from "../../ui/toast";
import { fullFixture } from "../../catalog/fixtures/full";
import { incompleteFixture } from "../../catalog/fixtures/incomplete";
import type { CatalogIndex, Plugin } from "../../catalog/types";

function withIndex(plugins: Plugin[]): CatalogIndex {
  return {
    marketplaceName: "ai-demo-marketplace",
    repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
    buildTimestamp: "2026-07-25T09:00:00.000Z",
    sourceCommitRef: "abc123",
    plugins,
  };
}

/**
 * Renders whichever route is currently active as plain text, so tests can
 * assert that the router's *own* state actually switched views on a click —
 * not merely that `location.hash` changed. This matters because
 * `RouterProvider` only listens for `popstate`, not `hashchange`: a plain
 * `<a href>` with no `onClick` interception changes the hash in a real
 * browser but never notifies the router, so the app would visibly stay on
 * the wrong view even though the URL bar disagrees.
 */
function RouteProbe() {
  const { route } = useRouter();
  return <div data-testid="route-view">{route.view}</div>;
}

function renderPlugin(index: CatalogIndex, hash: string) {
  window.location.hash = hash;
  return render(
    <RouterProvider>
      <ToastProvider>
        <ToastHost />
        <RouteProbe />
        <PluginView index={index} />
      </ToastProvider>
    </RouterProvider>,
  );
}

function resetHash() {
  window.location.hash = "";
}

describe("PluginView", () => {
  afterEach(() => {
    resetHash();
    __resetBackProvenanceForTests();
    vi.restoreAllMocks();
  });

  it("renders every populated region for a fully-populated plugin", () => {
    renderPlugin(fullFixture, "#/plugin/frontend-skills");

    // Header
    const heading = screen.getByRole("heading", { level: 1, name: "Frontend Skills" });
    expect(heading).toBeInTheDocument();
    const header = heading.closest("header")!;
    expect(within(header).getByText("v1.2.0")).toBeInTheDocument();
    expect(within(header).getByText("Claude Code >= 1.0")).toBeInTheDocument();
    expect(screen.getByText(/Frontend skill pack/)).toBeInTheDocument();
    expect(screen.getByText("Ivan Lapa")).toBeInTheDocument();

    // Install + source
    expect(screen.getByText("/plugin install frontend-skills@ai-demo-marketplace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy install" })).toBeInTheDocument();
    const sourceLink = screen.getByRole("link", { name: /view repository on github/i });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/frontend-skills",
    );
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink.getAttribute("rel")).toContain("noopener");

    // Artifacts — two groups: skill and agent
    const artifactsHeading = screen.getByRole("heading", { name: "Plugin contents" });
    const artifactsSection = artifactsHeading.closest("section")!;
    expect(within(artifactsSection).getByText("React Best Practices")).toBeInTheDocument();
    expect(within(artifactsSection).getByText("React Analyzer")).toBeInTheDocument();

    // Dependencies — one internal (link), one external (not a link, marked external)
    const dependenciesHeading = screen.getByRole("heading", { name: "Dependencies" });
    const dependenciesSection = dependenciesHeading.closest("section")!;
    expect(within(dependenciesSection).getByRole("link", { name: /research-tools/ })).toBeInTheDocument();
    expect(
      within(dependenciesSection).queryByRole("link", { name: /some-external-toolkit/ }),
    ).not.toBeInTheDocument();
    expect(within(dependenciesSection).getByText("some-external-toolkit")).toBeInTheDocument();
    expect(within(dependenciesSection).getByText("External")).toBeInTheDocument();

    // README
    expect(screen.getByRole("heading", { name: "README" })).toBeInTheDocument();

    // Changelog
    expect(screen.getByRole("heading", { name: "Changelog" })).toBeInTheDocument();
    expect(screen.getByText("Added React Testing Library skill.")).toBeInTheDocument();
  });

  it("shows exactly one artifact group for a plugin that only ships skills", () => {
    const skillsOnlyPlugin: Plugin = {
      id: "skills-only",
      name: "skills-only",
      displayName: "Skills Only",
      description: "A plugin with only skills.",
      installCommand: { text: "/plugin install skills-only@ai-demo-marketplace", scope: "plugin-installation" },
      sourceUrl: "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/skills-only",
      artifacts: [
        {
          id: "skills-only--skill--one",
          kind: "skill",
          name: "one",
          displayName: "One",
          owningPluginId: "skills-only",
          sourceUrl: "https://example.com/one",
          searchText: "one",
        },
        {
          id: "skills-only--skill--two",
          kind: "skill",
          name: "two",
          displayName: "Two",
          owningPluginId: "skills-only",
          sourceUrl: "https://example.com/two",
          searchText: "two",
        },
      ],
      searchText: "skills only",
    };

    renderPlugin(withIndex([skillsOnlyPlugin]), "#/plugin/skills-only");

    const artifactsHeading = screen.getByRole("heading", { name: "Plugin contents" });
    const artifactsSection = artifactsHeading.closest("section")!;
    expect(within(artifactsSection).getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(within(artifactsSection).getByText("One")).toBeInTheDocument();
    expect(within(artifactsSection).getByText("Two")).toBeInTheDocument();
  });

  it("omits the dependency section entirely for a plugin with no dependencies", () => {
    renderPlugin(incompleteFixture, "#/plugin/bare-plugin");

    expect(screen.queryByRole("heading", { name: "Dependencies" })).not.toBeInTheDocument();
  });

  it("shows the README placeholder with a contribution link for a README-less plugin", () => {
    renderPlugin(incompleteFixture, "#/plugin/bare-plugin");

    expect(screen.getByText(/has not published a readme yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contribution guidelines/i })).toBeInTheDocument();
  });

  it("shows no compatibility badge and no last-updated stamp for a plugin declaring neither", () => {
    renderPlugin(incompleteFixture, "#/plugin/bare-plugin");

    expect(screen.queryByText("Claude Code >= 1.0")).not.toBeInTheDocument();
    expect(screen.queryByRole("time")).not.toBeInTheDocument();
  });

  it("renders an undated changelog entry with no date, sorted after every dated entry, and never renders an invalid date", () => {
    const plugin: Plugin = {
      ...incompleteFixture.plugins[0],
      id: "dated-and-undated",
      changelogEntries: [
        { version: "1.0.0", date: "2026-01-01T00:00:00.000Z", summary: "First.", owningPluginId: "dated-and-undated" },
        { version: "0.9.0", summary: "Undated entry.", owningPluginId: "dated-and-undated" },
        { version: "0.8.0", date: "not-a-real-date", summary: "Unparseable date.", owningPluginId: "dated-and-undated" },
      ],
    };

    renderPlugin(withIndex([plugin]), "#/plugin/dated-and-undated");

    const changelogHeading = screen.getByRole("heading", { name: "Changelog" });
    const entries = within(changelogHeading.closest("section")!).getAllByRole("listitem");
    expect(entries).toHaveLength(3);
    expect(within(entries[0]).getByText("First.")).toBeInTheDocument();
    expect(within(entries[1]).getByText("Undated entry.")).toBeInTheDocument();
    expect(within(entries[2]).getByText("Unparseable date.")).toBeInTheDocument();

    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
  });

  it("returns to home from the back control when the view was reached by a deep link", async () => {
    const user = userEvent.setup();
    renderPlugin(incompleteFixture, "#/plugin/bare-plugin");

    await user.click(screen.getByRole("link", { name: /back/i }));

    expect(window.location.hash).toBe("#/");
    // Not just the URL: the router's own state must have switched too (see
    // `RouteProbe` above) — a plain, un-intercepted `<a href>` would leave
    // this reading "plugin" forever in a real browser.
    expect(screen.getByTestId("route-view")).toHaveTextContent("home");
  });

  it("activating the not-found state's home link switches the rendered route, not merely the URL hash", async () => {
    const user = userEvent.setup();
    renderPlugin(withIndex([]), "#/plugin/does-not-exist");

    expect(screen.getByTestId("route-view")).toHaveTextContent("plugin");
    expect(screen.getByText("This plugin doesn't exist.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /back to home/i }));

    expect(window.location.hash).toBe("#/");
    expect(screen.getByTestId("route-view")).toHaveTextContent("home");
  });
});
