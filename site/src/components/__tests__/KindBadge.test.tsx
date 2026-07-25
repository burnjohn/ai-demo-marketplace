import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { t } from "../../i18n";
import { KindBadge } from "../KindBadge";
import { VersionBadge } from "../VersionBadge";

describe("KindBadge", () => {
  it("renders a text label for every kind, not only a colour", () => {
    render(
      <>
        <KindBadge kind="plugin" />
        <KindBadge kind="skill" />
        <KindBadge kind="agent" />
        <KindBadge kind="command" />
        <KindBadge kind="hook" />
        <KindBadge kind="mcp" />
      </>,
    );

    // Each kind is identifiable purely from its text, independent of the
    // `data-kind`-driven colour applied via CSS (which jsdom doesn't render
    // anyway) — this is the observable equivalent of "identifiable in
    // greyscale".
    expect(screen.getByText(t("kind.label.plugin"))).toBeInTheDocument();
    expect(screen.getByText(t("kind.label.skill"))).toBeInTheDocument();
    expect(screen.getByText(t("kind.label.agent"))).toBeInTheDocument();
    expect(screen.getByText(t("kind.label.command"))).toBeInTheDocument();
    expect(screen.getByText(t("kind.label.hook"))).toBeInTheDocument();
    expect(screen.getByText(t("kind.label.mcp"))).toBeInTheDocument();
  });
});

describe("VersionBadge", () => {
  it("shows the version when present", () => {
    render(<VersionBadge version="1.2.0" />);
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
  });

  it("shows a neutral, non-empty placeholder when absent", () => {
    render(<VersionBadge />);
    const placeholder = screen.getByText(t("version.placeholder"));
    expect(placeholder).toBeInTheDocument();
    expect(placeholder.textContent).not.toBe("");
    expect(placeholder).toHaveAttribute("data-placeholder", "true");
  });
});
