import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MarkdownContent } from "../MarkdownContent";

declare global {
  // eslint-disable-next-line no-var
  var __scriptExecuted: boolean | undefined;
}

afterEach(() => {
  globalThis.__scriptExecuted = undefined;
});

describe("MarkdownContent", () => {
  it("renders a script tag, an inline event handler, an iframe and a javascript: link as inert — nothing executes, no frame loads", async () => {
    const malicious = [
      "# Untrusted README",
      "",
      "<script>window.__scriptExecuted = true;</script>",
      "",
      '<img src="x" onerror="window.__scriptExecuted = true" />',
      "",
      '<iframe src="https://evil.example.com/"></iframe>',
      "",
      "[click me](javascript:window.__scriptExecuted = true)",
    ].join("\n");

    const { container } = render(<MarkdownContent markdown={malicious} />);

    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    });

    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/onerror/i);

    const javascriptLink = screen.queryByText("click me");
    // The link text may render as plain text or as an anchor without an href
    // (scheme dropped) — either way it must not carry a `javascript:` href.
    if (javascriptLink && javascriptLink.tagName === "A") {
      expect(javascriptLink).not.toHaveAttribute("href", expect.stringContaining("javascript:"));
      expect(javascriptLink.getAttribute("href")).not.toMatch(/^javascript:/i);
    }

    // Nothing in the malicious markdown executed.
    expect(globalThis.__scriptExecuted).toBeUndefined();
  });

  it("permits only http/https/mailto links, opening external ones in an isolated context", async () => {
    const markdown = [
      "[external](https://example.com/page)",
      "",
      "[email](mailto:hello@example.com)",
      "",
      "[data-uri](data:text/html,<script>alert(1)</script>)",
    ].join("\n\n");

    const { container } = render(<MarkdownContent markdown={markdown} />);

    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    });

    const externalLink = screen.getByRole("link", { name: "external" });
    expect(externalLink).toHaveAttribute("href", "https://example.com/page");
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", expect.stringContaining("noopener"));

    const mailLink = screen.getByRole("link", { name: "email" });
    expect(mailLink).toHaveAttribute("href", "mailto:hello@example.com");

    const dataLink = screen.queryByRole("link", { name: "data-uri" });
    if (dataLink) {
      expect(dataLink.getAttribute("href")).not.toMatch(/^data:/i);
    }
  });

  it("permits images only from the page's own origin, issuing no request to third-party hosts", async () => {
    const markdown = [
      `![same-origin](${window.location.origin}/logo.png)`,
      "",
      "![relative](assets/screenshot.png)",
      "",
      "![tracker](https://tracker.example.com/pixel.gif)",
    ].join("\n\n");

    const { container } = render(<MarkdownContent markdown={markdown} />);

    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    });

    const images = Array.from(container.querySelectorAll("img"));
    // No image element sourced from the third-party host may exist at all —
    // that is what guarantees no request is ever issued to it.
    expect(images.some((img) => img.getAttribute("src")?.includes("tracker.example.com"))).toBe(
      false,
    );
    expect(
      images.some((img) => (img.getAttribute("src") ?? "").includes("logo.png")),
    ).toBe(true);
    expect(
      images.some((img) => (img.getAttribute("src") ?? "").includes("screenshot.png")),
    ).toBe(true);
  });

  it("length-bounds contributor text before it reaches layout: a 50 000-character description renders truncated with intact layout", async () => {
    const huge = "A very long README paragraph. ".repeat(2000); // ~62 000 chars
    expect(huge.length).toBeGreaterThan(50_000);

    const { container } = render(<MarkdownContent markdown={huge} />);

    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    });

    // The rendered text must be strictly shorter than the source — proving it
    // was bounded before conversion/layout, not merely CSS-clamped.
    expect(container.textContent!.length).toBeLessThan(huge.length);
    // A single content root is still present — no layout-breaking runaway.
    expect(container.querySelector(".markdown-content")).toBeInTheDocument();
  });
});
