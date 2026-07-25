/**
 * Accessibility gate.
 *
 * axe cannot assess colour contrast in jsdom (no real layout/paint engine —
 * see `scripts/check-contrast.mjs`, a separate Node script over the token
 * source, for that). This file instead runs axe's structural/semantic rule
 * set (with the `color-contrast` rule disabled, since jsdom would either
 * skip or falsely pass/fail it) over every one of the app's states, and
 * layers on assertions axe does not make on its own: every icon-only
 * control has an accessible name, every dynamic region announces through a
 * live region, and colour is never the only signal distinguishing a kind,
 * state or status.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
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

const AXE_OPTIONS = {
  rules: {
    // jsdom performs no layout/paint — colour contrast is verified for real
    // by `scripts/check-contrast.mjs` against the token source instead.
    "color-contrast": { enabled: false },
  },
};

async function runAxe(container: Element) {
  // `vitest-axe/extend-expect`'s built output ships empty in the installed
  // version (`node_modules/vitest-axe/dist/extend-expect.js` is an empty
  // file, and re-exporting its `toHaveNoViolations` matcher hits a broken
  // type-only re-export in `matchers.d.ts`) — asserting on
  // `results.violations` directly avoids depending on that matcher at all.
  const results = await axe(container, AXE_OPTIONS);
  if (results.violations.length > 0) {
    const details = results.violations
      .map((violation) => `- ${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`)
      .join("\n");
    throw new Error(`axe found ${results.violations.length} violation(s):\n${details}`);
  }
  expect(results.violations).toEqual([]);
}

describe("Accessibility gate", () => {
  beforeEach(() => {
    resetDom();
    vi.stubGlobal("fetch", vi.fn());
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDom();
  });

  it("has zero axe violations on the populated home view, and every icon-only control has an accessible name", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));

    const { container } = render(<App />);
    await screen.findByRole("heading", { level: 1, name: /discover plugins for your ai workflow/i });

    await runAxe(container);

    // Icon-only controls in the shell header carry an accessible name via
    // `aria-label` (Shell.tsx) rather than visible text.
    expect(screen.getByRole("button", { name: /command palette|⌘k/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /switch to (light|dark) (mode|theme)|theme/i }),
    ).toBeInTheDocument();
  });

  it("has zero axe violations on a populated search view, and announces the result count as a live region", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/search?q=react";

    const { container } = render(<App />);
    await screen.findByRole("heading", { level: 1 });
    await screen.findByText(/react best practices/i);

    await runAxe(container);

    const countRegion = screen.getByText(/result/i, { selector: "p" });
    const liveAncestor = countRegion.closest('[aria-live], [role="status"], [role="alert"]');
    expect(liveAncestor).not.toBeNull();
  });

  it("has zero axe violations on a zero-result search, and the empty state announces via a status live region", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/search?q=zzz-no-such-result-zzz";

    const { container } = render(<App />);
    const status = await screen.findByText(/no results/i);
    expect(status.closest('[role="status"]')).not.toBeNull();

    await runAxe(container);
  });

  it("has zero axe violations on the empty-catalog home view", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(emptyFixture));

    const { container } = render(<App />);
    await screen.findByRole("heading", { level: 1 });

    await runAxe(container);
  });

  it("has zero axe violations on a not-found route", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/plugin/";

    const { container } = render(<App />);
    await screen.findByText(/this plugin doesn't exist/i);

    await runAxe(container);
  });

  it("has zero axe violations on a failed index load, and the error surface is an alert live region distinct from an empty state", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(corruptEmptyObject));

    const { container } = render(<App />);
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    await runAxe(container);
  });

  it("announces the copy-to-clipboard success state through a live region, and shows a text label, not colour alone", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/search";
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole("heading", { level: 1 });

    const copyButtons = await screen.findAllByRole("button", { name: /copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);
    await user.click(copyButtons[0]);

    // The toast host (`ToastHost.tsx`) is the always-present `role="status"`
    // `aria-live="polite"` region that receives the copy-success message.
    await waitFor(() => {
      const toast = screen.getByTestId("toast-host");
      expect(toast).toHaveTextContent(/copied|copy/i);
    });
    const toast = screen.getByTestId("toast-host");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("every kind badge carries a text label, not colour alone", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/search";

    render(<App />);
    await screen.findByRole("heading", { level: 1 });

    const badges = document.querySelectorAll("[data-kind]");
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of Array.from(badges)) {
      // Text content is non-empty and comes from the message catalogue, not
      // an empty coloured swatch that would vanish in greyscale.
      expect(badge.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
