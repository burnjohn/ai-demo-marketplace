import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, useRouter } from "../../../routing";
import { ToastProvider } from "../../../ui/toast";
import { fullFixture } from "../../../catalog/fixtures/full";
import { ArtifactView } from "../ArtifactView";
import { __resetSearchMemoryForTests } from "../searchMemory";

function renderArtifact(artifactId: string) {
  window.history.pushState({}, "", `#/artifact/${artifactId}`);
  return render(
    <RouterProvider>
      <ToastProvider>
        <ArtifactView index={fullFixture} />
      </ToastProvider>
    </RouterProvider>,
  );
}

/** Renders the artifact view alongside a spy that reports the current route,
 * so breadcrumb navigation assertions don't depend on a second mounted view. */
function renderArtifactWithRouteSpy(artifactId: string) {
  window.history.pushState({}, "", `#/artifact/${artifactId}`);

  function RouteSpy() {
    const { route } = useRouter();
    return <div data-testid="route-spy">{JSON.stringify(route)}</div>;
  }

  return render(
    <RouterProvider>
      <ToastProvider>
        <ArtifactView index={fullFixture} />
        <RouteSpy />
      </ToastProvider>
    </RouterProvider>,
  );
}

beforeEach(() => {
  __resetSearchMemoryForTests();
});

describe("ArtifactView", () => {
  it("renders all regions for a skill (no invocation, has tools, has documentation)", () => {
    renderArtifact("frontend-skills--skill--react-best-practices");

    // Breadcrumb.
    expect(screen.getByRole("link", { name: /catalogue/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /frontend skills/i })).toBeInTheDocument();

    // Kind badge + display name + description.
    expect(screen.getByText(/^skill$/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "React Best Practices" })).toBeInTheDocument();
    expect(screen.getByText(/modern react conventions/i)).toBeInTheDocument();

    // Install command copied verbatim from the owning plugin.
    expect(
      screen.getByText("/plugin install frontend-skills@ai-demo-marketplace"),
    ).toBeInTheDocument();

    // No invocation declared -> no invocation pill in the title row.
    expect(
      screen.queryByLabelText(/invocation/i, { selector: "span" }),
    ).not.toBeInTheDocument();

    // Tools declared -> discrete labelled items.
    expect(screen.getByRole("heading", { name: /tools & permissions/i })).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Grep")).toBeInTheDocument();
  });

  it("renders every declared artifact kind's regions, with the install text matching the owning plugin verbatim", () => {
    const cases = [
      { id: "frontend-skills--skill--react-best-practices", pluginId: "frontend-skills" },
      { id: "frontend-skills--agent--react-analyzer", pluginId: "frontend-skills" },
      { id: "sdd-workflow--command--build", pluginId: "sdd-workflow" },
      { id: "sdd-workflow--hook--pre-commit", pluginId: "sdd-workflow" },
      { id: "sdd-workflow--mcp--workflow-server", pluginId: "sdd-workflow" },
    ];

    for (const { id, pluginId } of cases) {
      const owningPlugin = fullFixture.plugins.find((plugin) => plugin.id === pluginId)!;
      const { unmount } = renderArtifact(id);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(owningPlugin.installCommand.text)).toBeInTheDocument();
      unmount();
    }
  });

  it("omits the invocation element for a hook with no invocation, and the tools heading when none are declared", () => {
    renderArtifact("sdd-workflow--hook--pre-commit");

    expect(
      screen.queryByLabelText(/invocation/i, { selector: "span" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /tools & permissions/i })).not.toBeInTheDocument();
  });

  it("shows the invocation token inline with the title when declared", () => {
    renderArtifact("frontend-skills--agent--react-analyzer");

    const invocation = screen.getByLabelText(/invocation/i, { selector: "span" });
    expect(invocation).toBeInTheDocument();
    expect(invocation).toHaveTextContent("@react-analyzer");
  });

  it("shows the documentation placeholder plus a source link when no documentation body is declared", () => {
    renderArtifact("sdd-workflow--command--build");

    expect(screen.getByText(/no additional documentation/i)).toBeInTheDocument();
    const sourceLink = screen.getByRole("link", {
      name: /plugins\/sdd-workflow\/commands\/build\.md/,
    });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/sdd-workflow/commands/build.md",
    );
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink.getAttribute("rel") ?? "").toContain("noopener");
  });

  it("navigates to the plugin view when the plugin breadcrumb segment is activated", async () => {
    const user = userEvent.setup();
    renderArtifactWithRouteSpy("frontend-skills--skill--react-best-practices");

    await user.click(screen.getByRole("link", { name: /frontend skills/i }));

    const spy = screen.getByTestId("route-spy");
    const route = JSON.parse(spy.textContent ?? "{}");
    expect(route).toMatchObject({ view: "plugin", pluginId: "frontend-skills" });
  });

  it("restores the last filtered search when returning via the catalog breadcrumb", async () => {
    const user = userEvent.setup();

    // Simulate the router having navigated to a filtered search earlier in
    // this session (as SearchView's `navigate` calls do via
    // history.replaceState/pushState).
    window.history.pushState({}, "", "#/search?kind=skill&q=react");

    renderArtifactWithRouteSpy("frontend-skills--skill--react-best-practices");

    await user.click(screen.getByRole("link", { name: /catalogue/i }));

    const spy = screen.getByTestId("route-spy");
    const route = JSON.parse(spy.textContent ?? "{}");
    expect(route.view).toBe("search");
    expect(route.search.kinds).toEqual(["skill"]);
    expect(route.search.query).toBe("react");
  });

  it("falls back to the unfiltered browse state via the catalog breadcrumb when no search happened this session", async () => {
    const user = userEvent.setup();
    renderArtifactWithRouteSpy("frontend-skills--skill--react-best-practices");

    await user.click(screen.getByRole("link", { name: /catalogue/i }));

    const spy = screen.getByTestId("route-spy");
    const route = JSON.parse(spy.textContent ?? "{}");
    expect(route).toMatchObject({ view: "search", search: { kinds: [], keywords: [] } });
  });

  it("renders the not-found state for an unknown artifact id", () => {
    renderArtifact("does-not-exist");

    expect(screen.getByText(/artifact doesn't exist/i)).toBeInTheDocument();
  });
});
