/**
 * Combo coverage + data-accuracy regression test.
 *
 * This guards the bug found in M6 live QA: mechanism entries were keyed by
 * (category_pattern + severity) but the severities were GUESSED, so most
 * entries never matched real TripSit data. These tests assert that:
 *
 *   1. Specific well-known pairs resolve the correct upstream severity AND a
 *      partysafe mechanism (so the content actually shows).
 *   2. A genuinely low-risk pair is NOT force-fitted to a scary mechanism.
 *   3. Overall mechanism coverage of risky pairs stays above a floor — if a
 *      future TripSit data refresh shifts severities, this catches the silent
 *      loss of coverage.
 *
 * Uses the real bundled dataset + mechanisms (not fixtures) so it tests the
 * actual shipping content.
 */
import { describe, expect, test } from "bun:test";
import dataset from "../data/tripsit.lean.json" with { type: "json" };
import mechanisms from "../data/mechanisms.json" with { type: "json" };
import { pairwiseRisksFor } from "../lib/combo.ts";
import type { LeanDataset, MechanismFile, SubstanceSlug } from "../types.ts";
import { pharmacologicalCategories, candidatePatterns } from "../lib/category-pattern.ts";

const ds = dataset as unknown as LeanDataset;
const mf = mechanisms as unknown as MechanismFile;

function analyze(a: string, b: string) {
  return pairwiseRisksFor([a, b] as SubstanceSlug[], { dataset: ds, mechanisms: mf });
}

describe("known pairs resolve correct severity + mechanism", () => {
  const cases: Array<[string, string, string]> = [
    ["alcohol", "ketamine", "Dangerous"],
    ["alcohol", "cocaine", "Unsafe"],
    ["alcohol", "tramadol", "Dangerous"],
    ["cocaine", "tramadol", "Dangerous"],
    ["ketamine", "tramadol", "Dangerous"],
    ["lsd", "tramadol", "Unsafe"],
    ["mdma", "cocaine", "Caution"],
    ["cocaine", "ketamine", "Caution"],
    ["cocaine", "lsd", "Caution"],
    ["cannabis", "lsd", "Caution"],
  ];
  for (const [a, b, sev] of cases) {
    test(`${a} + ${b} → ${sev} with mechanism prose`, () => {
      const r = analyze(a, b);
      const pair = r.pairs[0];
      expect(pair?.severity).toBe(sev as never);
      expect(pair?.mechanism, `${a}+${b} should have a partysafe mechanism, not just the upstream note`).toBeDefined();
      expect(pair?.mechanism?.locales.en?.mechanism_prose.length).toBeGreaterThan(40);
    });
  }
});

describe("low-risk pairs are NOT force-fitted to a danger mechanism", () => {
  test("mdma + ketamine is Low Risk & Synergy and shows no scary mechanism", () => {
    const r = analyze("mdma", "ketamine");
    const pair = r.pairs[0];
    expect(pair?.severity).toBe("Low Risk & Synergy" as never);
    // No risky-severity mechanism should be attached to a synergy pair.
    expect(pair?.mechanism).toBeUndefined();
  });

  test("alcohol + cannabis is Low Risk & Synergy (no respiratory-depression alarm)", () => {
    const r = analyze("alcohol", "cannabis");
    const pair = r.pairs[0];
    expect(pair?.severity).toBe("Low Risk & Synergy" as never);
    expect(pair?.mechanism).toBeUndefined();
  });
});

describe("mechanism coverage of risky pairs stays above floor", () => {
  test("≥ 80% of all risky pairs resolve a mechanism", () => {
    const idx = new Set(mf.entries.map((e) => `${e.category_pattern}|${e.severity}`));
    const risky = new Set(["Caution", "Unsafe", "Dangerous"]);
    const seen = new Set<string>();
    let matched = 0;
    let total = 0;
    for (const [a, subA] of Object.entries(ds)) {
      if (!subA.combos) continue;
      for (const [b, combo] of Object.entries(subA.combos)) {
        if (!risky.has(combo.status) || !ds[b]) continue;
        const id = [a, b].sort().join("+") + "|" + combo.status;
        if (seen.has(id)) continue;
        seen.add(id);
        total++;
        const pats = candidatePatterns(
          pharmacologicalCategories(subA.categories),
          pharmacologicalCategories(ds[b]!.categories),
        );
        if (pats.some((p) => idx.has(`${p}|${combo.status}`))) matched++;
      }
    }
    expect(total).toBeGreaterThan(50); // sanity: the dataset has plenty of risky pairs
    expect(matched / total).toBeGreaterThanOrEqual(0.8);
  });

  test("every mechanism entry's category_pattern is lexicographically ordered", () => {
    for (const e of mf.entries) {
      const [x, y] = e.category_pattern.split("+");
      expect(x! <= y!, `${e.category_pattern} must be ordered`).toBe(true);
    }
  });

  test("no duplicate (pattern, severity) keys", () => {
    const keys = mf.entries.map((e) => `${e.category_pattern}|${e.severity}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
