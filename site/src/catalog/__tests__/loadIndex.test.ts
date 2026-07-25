import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyFixture } from "../fixtures/empty";
import { corruptEmptyObject } from "../fixtures/corrupt";
import { loadCatalogIndex, resolveCatalogIndexUrl } from "../loadIndex";
import type { CatalogIndexState } from "../loadIndex";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe("loadCatalogIndex", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("respects BASE_URL when resolving the index asset URL", () => {
    const url = resolveCatalogIndexUrl();
    expect(url.startsWith(import.meta.env.BASE_URL)).toBe(true);
    expect(url.endsWith("catalog-index.json")).toBe(true);
  });

  it("transitions loading -> loaded for a valid, non-empty index", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(emptyFixture));

    const states: CatalogIndexState[] = [];
    await new Promise<void>((resolve) => {
      loadCatalogIndex((state) => {
        states.push(state);
        if (state.status !== "loading") resolve();
      });
    });

    expect(states[0]).toEqual({ status: "loading" });
    const last = states[states.length - 1];
    expect(last.status).toBe("loaded");
    if (last.status === "loaded") {
      expect(last.data.plugins).toEqual([]);
    }
  });

  it("produces a failed state (not the empty-catalog state) for a corrupt/unparseable body", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(corruptEmptyObject));

    const states: CatalogIndexState[] = [];
    await new Promise<void>((resolve) => {
      loadCatalogIndex((state) => {
        states.push(state);
        if (state.status !== "loading") resolve();
      });
    });

    const last = states[states.length - 1];
    expect(last.status).toBe("failed");
    if (last.status === "failed") {
      expect(last.reason.length).toBeGreaterThan(0);
      expect(typeof last.retry).toBe("function");
    }
    // Distinctness check: failed is never mistaken for a loaded empty catalog.
    expect(last).not.toMatchObject({ status: "loaded" });
  });

  it("produces a failed state on a non-OK HTTP response, without throwing", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

    const states: CatalogIndexState[] = [];
    await new Promise<void>((resolve) => {
      loadCatalogIndex((state) => {
        states.push(state);
        if (state.status !== "loading") resolve();
      });
    });

    const last = states[states.length - 1];
    expect(last.status).toBe("failed");
  });

  it("produces a failed state on a network error, without throwing", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const states: CatalogIndexState[] = [];
    await new Promise<void>((resolve) => {
      loadCatalogIndex((state) => {
        states.push(state);
        if (state.status !== "loading") resolve();
      });
    });

    const last = states[states.length - 1];
    expect(last.status).toBe("failed");
    if (last.status === "failed") {
      expect(last.reason).toContain("network down");
    }
  });

  it("supports retry, re-running the fetch and eventually reaching loaded", async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));
    mockedFetch.mockResolvedValueOnce(jsonResponse(emptyFixture));

    const states: CatalogIndexState[] = [];
    const { retry } = await new Promise<{ retry: () => void }>((resolve) => {
      const handle = loadCatalogIndex((state) => {
        states.push(state);
        if (state.status === "failed") resolve(handle);
      });
    });

    await new Promise<void>((resolve) => {
      const originalPush = states.push.bind(states);
      states.push = ((state: CatalogIndexState) => {
        const result = originalPush(state);
        if (state.status === "loaded") resolve();
        return result;
      }) as typeof states.push;
      retry();
    });

    const last = states[states.length - 1];
    expect(last.status).toBe("loaded");
  });
});
