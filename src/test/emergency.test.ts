import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  detectRegion,
  primaryHotline,
  resolveHotlines,
  setRegionOverride,
  supportLinesFor,
} from "../lib/emergency.ts";

// Bun's test runtime has no DOM localStorage; the browser does. Provide a
// minimal in-memory shim so the override-persistence path is exercised the
// same way it runs in a browser.
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

afterEach(() => {
  // Clear any override set during a test so cases stay independent.
  setRegionOverride(undefined);
});

describe("detectRegion — does NOT assume American", () => {
  test("bare 'en' is ambiguous → universal (OTHER), not US", () => {
    expect(detectRegion("en")).toBe("OTHER");
  });

  test("bare 'fr' / 'de' / 'es' are ambiguous → universal, not a country", () => {
    expect(detectRegion("fr")).toBe("OTHER");
    expect(detectRegion("de")).toBe("OTHER");
    expect(detectRegion("es")).toBe("OTHER");
  });

  test("undefined language → universal", () => {
    expect(detectRegion(undefined)).toBe("OTHER");
  });

  test("explicit country subtags map correctly", () => {
    expect(detectRegion("en-US")).toBe("US");
    expect(detectRegion("en-GB")).toBe("GB");
    expect(detectRegion("et-EE")).toBe("EU");
    expect(detectRegion("de-DE")).toBe("EU");
    expect(detectRegion("pt-BR")).toBe("PT-BR");
    expect(detectRegion("pt-PT")).toBe("EU");
    expect(detectRegion("en-AU")).toBe("AU");
    expect(detectRegion("en-NZ")).toBe("NZ");
    expect(detectRegion("en-CA")).toBe("CA");
    expect(detectRegion("en-IE")).toBe("IE");
    expect(detectRegion("hi-IN")).toBe("IN");
    expect(detectRegion("en-ZA")).toBe("ZA");
  });

  test("underscore-separated tags normalize", () => {
    expect(detectRegion("en_US")).toBe("US");
    expect(detectRegion("pt_BR")).toBe("PT-BR");
  });

  test("unknown country subtag → universal", () => {
    expect(detectRegion("en-XX")).toBe("OTHER");
    expect(detectRegion("ja-JP")).toBe("OTHER"); // Japan not yet mapped → universal
  });
});

describe("primaryHotline — universal default is 112, not 911", () => {
  test("OTHER region uses 112 (GSM universal), not 911", () => {
    const h = primaryHotline("OTHER");
    expect(h.tel).toBe("112");
    expect(h.label).not.toContain("911");
  });

  test("regional numbers are correct", () => {
    expect(primaryHotline("US").tel).toBe("911");
    expect(primaryHotline("GB").tel).toBe("999");
    expect(primaryHotline("EU").tel).toBe("112");
    expect(primaryHotline("AU").tel).toBe("000");
    expect(primaryHotline("NZ").tel).toBe("111");
    expect(primaryHotline("PT-BR").tel).toBe("192");
    expect(primaryHotline("IN").tel).toBe("112");
  });
});

describe("resolveHotlines — override + support lines", () => {
  test("fresh visitor with no language gets 112, no US support line surfaced", () => {
    const r = resolveHotlines(undefined);
    expect(r.primary.tel).toBe("112");
    expect(r.source).toBe("fallback");
    // No US-only line shoved at an unknown-region visitor.
    expect(r.support.find((s) => s.name.includes("Never Use Alone"))).toBeUndefined();
  });

  test("US visitor sees Never Use Alone as a support line", () => {
    const r = resolveHotlines("en-US");
    expect(r.primary.tel).toBe("911");
    expect(r.support.some((s) => s.name === "Never Use Alone")).toBe(true);
  });

  test("EU visitor does NOT get the US Never Use Alone line", () => {
    const r = resolveHotlines("de-DE");
    expect(r.primary.tel).toBe("112");
    expect(r.support.some((s) => s.name === "Never Use Alone")).toBe(false);
  });

  test("manual override wins over detected language", () => {
    setRegionOverride("GB");
    const r = resolveHotlines("en-US");
    expect(r.region).toBe("GB");
    expect(r.primary.tel).toBe("999");
    expect(r.source).toBe("override");
  });
});

describe("supportLinesFor", () => {
  test("Canada has NORS", () => {
    expect(supportLinesFor("CA").some((s) => s.name.includes("NORS"))).toBe(true);
  });
  test("unknown region has no support lines (just the emergency number)", () => {
    expect(supportLinesFor("OTHER")).toEqual([]);
  });
});
