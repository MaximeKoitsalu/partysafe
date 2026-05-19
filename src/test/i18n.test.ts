import { describe, expect, test } from "bun:test";
import type { MechanismEntry } from "../types.ts";
import { fallbackChain, resolveLocale } from "../lib/i18n.ts";

describe("fallbackChain", () => {
  test("pt-BR → pt → en", () => {
    expect(fallbackChain("pt-BR")).toEqual(["pt-BR", "pt", "en"]);
  });
  test("en stays en (no duplicate)", () => {
    expect(fallbackChain("en")).toEqual(["en"]);
  });
  test("en-US → en (no duplicate at end)", () => {
    expect(fallbackChain("en-US")).toEqual(["en-US", "en"]);
  });
  test("underscore normalized to hyphen", () => {
    expect(fallbackChain("pt_BR")).toEqual(["pt-BR", "pt", "en"]);
  });
  test("language-only request short-circuits the second hop", () => {
    expect(fallbackChain("de")).toEqual(["de", "en"]);
  });
});

function makeEntry(overrides: Partial<MechanismEntry["locales"]>): MechanismEntry {
  return {
    id: "test-entry",
    category_pattern: "depressant+stimulant",
    severity: "Caution",
    locales: {
      en: {
        mechanism_prose: "english prose",
        warning_signs: ["sign"],
        first_aid: ["step"],
      },
      ...overrides,
    },
    sources: [{ source: "test", url: "https://example.com", accessed_at: "2026-05-19" }],
    reviewed_by: [],
    reviewed_at: "2026-05-19",
  };
}

describe("resolveLocale", () => {
  test("exact match returns the requested locale", () => {
    const e = makeEntry({
      "pt-BR": { mechanism_prose: "br", warning_signs: ["s"], first_aid: ["a"] },
    });
    expect(resolveLocale(e, "pt-BR").locale).toBe("pt-BR");
    expect(resolveLocale(e, "pt-BR").content.mechanism_prose).toBe("br");
  });
  test("falls back to language-only", () => {
    const e = makeEntry({
      pt: { mechanism_prose: "pt", warning_signs: ["s"], first_aid: ["a"] },
    });
    expect(resolveLocale(e, "pt-BR").locale).toBe("pt");
  });
  test("falls back to en", () => {
    const e = makeEntry({});
    expect(resolveLocale(e, "fr-FR").locale).toBe("en");
    expect(resolveLocale(e, "fr-FR").content.mechanism_prose).toBe("english prose");
  });
  test("throws when en is missing", () => {
    const e: MechanismEntry = {
      id: "bad",
      category_pattern: "depressant+stimulant",
      severity: "Caution",
      // @ts-expect-error — deliberately constructing an invalid entry
      locales: {
        pt: { mechanism_prose: "pt-only", warning_signs: ["s"], first_aid: ["a"] },
      },
      sources: [{ source: "t", url: "https://example.com", accessed_at: "2026-05-19" }],
      reviewed_by: [],
      reviewed_at: "2026-05-19",
    };
    expect(() => resolveLocale(e, "de")).toThrow();
  });
});
