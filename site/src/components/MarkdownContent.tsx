import { useEffect, useState } from "react";
import "./components.css";

/**
 * Contributor-authored text is length-bounded *before* it ever reaches
 * `marked` or the DOM — an oversized README/description/summary must not
 * be able to degrade rendering or blow up layout, independent of whatever
 * CSS clamping a card applies.
 */
const MAX_MARKDOWN_LENGTH = 20_000;
const TRUNCATION_SUFFIX = "\n\n…";

/** Only these link schemes are ever permitted. Everything else — including
 * `javascript:` and `data:` — is dropped. */
const ALLOWED_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

function truncate(markdown: string, maxLength: number): string {
  if (markdown.length <= maxLength) return markdown;
  return `${markdown.slice(0, maxLength)}${TRUNCATION_SUFFIX}`;
}

/** Parses a URL. Returns null for anything that cannot be resolved as a URL at all
 * (e.g. malformed input) rather than throwing. */
function tryParseUrl(value: string, base?: string): URL | null {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

/**
 * Sanitises a `marked`-rendered HTML string in place:
 *  - drops every `<script>`/`<style>`/`<iframe>`/`<frame>`/`<embed>`/`<object>` element,
 *  - drops every `on*` event-handler attribute,
 *  - restricts `<a href>` to http/https/mailto, adding an isolated new context
 *    for external (http/https) targets,
 *  - restricts `<img src>` to the page's own origin, dropping every other image
 *    so no request is ever issued to a third-party host.
 *
 * DOMPurify is configured to do the structural stripping; the link/image
 * scheme and origin policy is enforced afterwards because it needs
 * information (the current page origin) that isn't expressible as a static
 * DOMPurify allow-list alone.
 */
function sanitizeRenderedHtml(html: string, DOMPurifyInstance: typeof import("dompurify").default): string {
  const clean = DOMPurifyInstance.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "frame", "frameset", "object", "embed"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onmouseout",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
      "srcdoc",
    ],
    // Same shape as DOMPurify's own default `ALLOWED_URI_REGEXP`, narrowed to
    // only the schemes the allow-list permits: an absolute URI must start with
    // http:, https: or mailto:; anything without a scheme at all (a
    // relative path, a bare `#anchor`) is left alone here and resolved
    // against the page origin in the second pass below. This is what keeps
    // `javascript:` and `data:` out while still allowing repo-relative
    // image paths.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  // Walk the sanitised markup a second time to enforce link-scheme and
  // image-origin policy that ALLOWED_URI_REGEXP alone cannot express
  // (same-origin-only images; new isolated context for external links).
  const container = document.createElement("div");
  container.innerHTML = clean;

  for (const anchor of Array.from(container.querySelectorAll("a"))) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    const resolved = tryParseUrl(href, window.location.href);
    if (!resolved || !ALLOWED_LINK_SCHEMES.has(resolved.protocol)) {
      anchor.removeAttribute("href");
      continue;
    }
    if (resolved.protocol === "mailto:") continue;
    if (resolved.origin !== window.location.origin) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
  }

  for (const img of Array.from(container.querySelectorAll("img"))) {
    const src = img.getAttribute("src");
    if (!src) {
      img.remove();
      continue;
    }
    const resolved = tryParseUrl(src, window.location.href);
    if (!resolved || resolved.origin !== window.location.origin) {
      img.remove();
    }
  }

  return container.innerHTML;
}

export interface MarkdownContentProps {
  /** Raw contributor-authored markdown (README body, changelog entry, etc.). */
  markdown: string;
  className?: string;
}

/**
 * Lazily loaded, sanitised markdown renderer.
 *
 * `marked` and `dompurify` are dynamically imported so they never enter the
 * app's entry chunk — this component only pulls them in once it is
 * actually mounted (i.e. on a detail view that has documentation to show).
 *
 * Order matters: markdown is converted to HTML first, then the
 * *result* is sanitised — sanitising the raw markdown source first would let
 * `marked` re-introduce markup/HTML that the sanitiser never saw.
 */
export function MarkdownContent({ markdown, className }: MarkdownContentProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const bounded = truncate(markdown, MAX_MARKDOWN_LENGTH);

    async function render() {
      const [{ marked }, DOMPurifyModule] = await Promise.all([
        import("marked"),
        import("dompurify"),
      ]);
      const DOMPurifyInstance = DOMPurifyModule.default;
      const rawHtml = await marked.parse(bounded, { async: true });
      if (cancelled) return;
      setHtml(sanitizeRenderedHtml(rawHtml, DOMPurifyInstance));
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [markdown]);

  if (html === null) {
    return (
      <div
        className={className ? `markdown-content ${className}` : "markdown-content"}
        aria-busy="true"
      />
    );
  }

  return (
    // eslint-disable-next-line react/no-danger -- `html` is DOMPurify-sanitised above.
    <div
      className={className ? `markdown-content ${className}` : "markdown-content"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
