/**
 * Category-pattern matching for mechanism lookup.
 *
 * A mechanism entry's `category_pattern` is an ordered pair like
 * `depressant+opioid`. To resolve a mechanism for a substance pair we:
 *   1. Look up the categories of each substance from the lean dataset
 *   2. Build all candidate (categoryA + categoryB) patterns (ordered)
 *   3. Find any mechanism whose `category_pattern` matches one candidate
 *
 * Substances usually have multiple categories (e.g. MDMA is "stimulant",
 * "psychedelic", "empathogen"); we try all pairwise combinations and prefer
 * the most specific match (the one with the most matching categories).
 */

import { CATEGORY_VOCABULARY, type Category } from "../data/SCHEMA.ts";

const VOCAB_SET = new Set<string>(CATEGORY_VOCABULARY);

/** Categories ignored when computing patterns — collection tags, not classes. */
const IGNORED_TAGS = new Set(["common", "tentative"]);

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && VOCAB_SET.has(v);
}

/**
 * Return the pharmacological categories of a substance, filtered to the
 * recognized vocabulary (drops `common`, `tentative`, and any unknown tags).
 */
export function pharmacologicalCategories(categories: string[]): Category[] {
  const out: Category[] = [];
  for (const c of categories) {
    if (IGNORED_TAGS.has(c)) continue;
    if (isCategory(c)) out.push(c);
  }
  return out;
}

/**
 * Build a single canonical pattern string for two categories, lexicographically
 * ordered. Mirrors the validator's requirement in SCHEMA.ts.
 */
export function patternKey(a: Category, b: Category): string {
  return a <= b ? `${a}+${b}` : `${b}+${a}`;
}

/**
 * All distinct ordered category-pair patterns for two substances. A substance
 * with categories `[stimulant, empathogen]` paired with `[dissociative]`
 * yields `[dissociative+stimulant, dissociative+empathogen]`.
 *
 * Same-category pairs (`stimulant+stimulant`) are included when both
 * substances share a category — that's the `depressant+depressant` pattern.
 */
export function candidatePatterns(catsA: Category[], catsB: Category[]): string[] {
  const seen = new Set<string>();
  for (const a of catsA) {
    for (const b of catsB) {
      seen.add(patternKey(a, b));
    }
  }
  return [...seen];
}
