import { describe, expect, test } from "bun:test";
import type { LeanDataset } from "../types.ts";
import { asSlug, buildSynonymIndex, validateSlug } from "../lib/synonyms.ts";

const fixture: LeanDataset = {
  mdma: {
    name: "mdma",
    pretty_name: "MDMA",
    aliases: ["molly", "ecstasy", "mandy", "xtc"],
    categories: ["stimulant", "empathogen"],
  },
  ketamine: {
    name: "ketamine",
    pretty_name: "Ketamine",
    aliases: ["k", "ket"],
    categories: ["dissociative"],
  },
  // Hypothetical ambiguous alias — both entries claim "x"
  alpha: {
    name: "alpha",
    pretty_name: "Alpha",
    aliases: ["x"],
    categories: ["stimulant"],
  },
  beta: {
    name: "beta",
    pretty_name: "Beta",
    aliases: ["x"],
    categories: ["depressant"],
  },
};

describe("validateSlug (branded)", () => {
  test("accepts kebab-case lowercase strings", () => {
    expect(validateSlug("mdma")).toBeDefined();
    expect(validateSlug("2c-b")).toBeDefined();
    expect(validateSlug("dx-25")).toBeDefined();
  });
  test("rejects uppercase, whitespace, special chars (XSS surface)", () => {
    expect(validateSlug("MDMA")).toBeUndefined();
    expect(validateSlug(" mdma ")).toBeUndefined();
    expect(validateSlug("<script>")).toBeUndefined();
    expect(validateSlug("mdma,ketamine")).toBeUndefined();
    expect(validateSlug("mdma'; DROP TABLE--")).toBeUndefined();
  });
  test("rejects non-strings", () => {
    expect(validateSlug(7 as unknown)).toBeUndefined();
    expect(validateSlug(null as unknown)).toBeUndefined();
    expect(validateSlug({} as unknown)).toBeUndefined();
  });
  test("asSlug throws on invalid input", () => {
    expect(() => asSlug("MDMA")).toThrow();
    expect(() => asSlug("<script>")).toThrow();
  });
});

describe("synonym index", () => {
  test("canonical name resolves to itself", () => {
    const idx = buildSynonymIndex(fixture);
    const hits = idx.resolve("mdma");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.slug).toBe(asSlug("mdma"));
    expect(hits[0]?.isCanonical).toBe(true);
  });
  test("alias resolves to canonical slug", () => {
    const idx = buildSynonymIndex(fixture);
    expect(idx.resolve("molly")[0]?.slug).toBe(asSlug("mdma"));
    expect(idx.resolve("ket")[0]?.slug).toBe(asSlug("ketamine"));
  });
  test("case-insensitive + whitespace tolerant", () => {
    const idx = buildSynonymIndex(fixture);
    expect(idx.resolve("MOLLY")[0]?.slug).toBe(asSlug("mdma"));
    expect(idx.resolve("  Mandy  ")[0]?.slug).toBe(asSlug("mdma"));
  });
  test("ambiguous alias returns multiple hits", () => {
    const idx = buildSynonymIndex(fixture);
    const hits = idx.resolve("x");
    expect(hits).toHaveLength(2);
    expect(hits.map((h) => h.slug).sort()).toEqual([asSlug("alpha"), asSlug("beta")]);
  });
  test("unknown query returns empty", () => {
    const idx = buildSynonymIndex(fixture);
    expect(idx.resolve("xyzzy")).toEqual([]);
    expect(idx.resolve("")).toEqual([]);
  });
});
