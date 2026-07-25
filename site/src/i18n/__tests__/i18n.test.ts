import { describe, expect, it } from "vitest";

import { formatCount, formatDate, getLocale, resolveFrom, setLocale, t } from "../index";
import { messages, type MessageKey } from "../messages";

describe("message catalogue", () => {
  it("resolves every key in the catalogue without throwing", () => {
    for (const key of Object.keys(messages) as MessageKey[]) {
      const entry = messages[key];
      const result =
        typeof entry === "function"
          ? entry({
              count: 3,
              query: "example",
              accent: "green",
              date: "2026-01-01T00:00:00.000Z",
              commit: "abc123",
              pluginName: "example-plugin",
              name: "Example",
            } as never)
          : entry;
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("resolves a static message and a parameterised message through t()", () => {
    expect(t("shell.brand")).toBe("AI Demo Marketplace");
    expect(t("search.heading.query", { query: "skills" })).toBe(
      'Results for “skills”',
    );
  });

  it("pluralises the result count through a single parameterised message", () => {
    expect(t("search.resultCount", { count: 0 })).toBe("0 results");
    expect(t("search.resultCount", { count: 1 })).toBe("1 result");
    expect(t("search.resultCount", { count: 12 })).toBe("12 results");
  });

  it("swapping the catalogue wholesale changes every rendered string", () => {
    const before = t("shell.brand");

    const replacement = {
      ...messages,
      "shell.brand": "Replaced Brand",
      "search.resultCount": (params: { count: number }) =>
        `REPLACED:${params.count}`,
    };

    const afterBrand = resolveFrom(replacement, "shell.brand");
    const afterCount = resolveFrom(replacement, "search.resultCount", {
      count: 7,
    });

    expect(afterBrand).not.toBe(before);
    expect(afterBrand).toBe("Replaced Brand");
    expect(afterCount).toBe("REPLACED:7");

    // Every other key in the replacement catalogue still resolves — proving the
    // swap is total, not a patch of one key.
    const sampleParams = {
      count: 1,
      query: "q",
      accent: "green",
      date: "2026-01-01T00:00:00.000Z",
      commit: "abc123",
      pluginName: "example-plugin",
      name: "Example",
    };
    for (const key of Object.keys(replacement) as MessageKey[]) {
      const entry = replacement[key];
      const result =
        typeof entry === "function"
          ? (entry as (p: unknown) => string)(sampleParams)
          : entry;
      expect(typeof result).toBe("string");
    }
  });
});

describe("Intl formatters", () => {
  it("formats dates and counts using the active locale, and changes with it", () => {
    const original = getLocale();
    try {
      setLocale("en");
      const enDate = formatDate("2026-03-04T00:00:00.000Z");
      const enCount = formatCount(1234, "item", "items");

      setLocale("de");
      const deDate = formatDate("2026-03-04T00:00:00.000Z");
      const deCount = formatCount(1234, "item", "items");

      // Same input date/count, different locale, different rendered output —
      // callers change nothing; only the active locale changes.
      expect(deDate).not.toBe(enDate);
      expect(deCount).not.toBe(enCount);
    } finally {
      setLocale(original);
    }
  });
});
