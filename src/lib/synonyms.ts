/**
 * Synonym + alias resolution + SubstanceSlug branding.
 *
 * The lean TripSit dataset gives us, per substance:
 *   name (slug, lowercase), pretty_name, aliases[]
 *
 * `buildSynonymIndex(dataset)` produces a Map keyed by lowercased alias OR
 * canonical name, valued either by a single SubstanceSlug or by an array
 * when the alias is ambiguous (e.g. "DXM" ambiguous between
 * dextromethorphan and possibly other entries with that alias).
 *
 * `validateSlug(s)` is the ONLY way to construct a SubstanceSlug. The hash
 * router and picker pass user input through this gate before rendering —
 * any string that doesn't match /^[a-z0-9-]+$/ is rejected. This is the XSS
 * defense at the boundary (PLAN.md Eng E15, F11).
 */

import type { LeanDataset, SubstanceSlug } from "../types.ts";

const SLUG_RE = /^[a-z0-9-]+$/;

/**
 * Validate a candidate string as a SubstanceSlug. Returns the branded slug
 * on success, undefined on failure (caller decides how to surface the error).
 *
 * NOTE: this only validates SHAPE. To check existence in the dataset, call
 * resolveAlias() or look up the slug in the dataset record directly.
 */
export function validateSlug(s: unknown): SubstanceSlug | undefined {
  if (typeof s !== "string") return undefined;
  if (!SLUG_RE.test(s)) return undefined;
  return s as SubstanceSlug;
}

/** Like validateSlug but throws on invalid input. Use only when caller has
 *  already validated shape and just needs the branded type. */
export function asSlug(s: string): SubstanceSlug {
  const v = validateSlug(s);
  if (!v) throw new Error(`invalid substance slug: ${JSON.stringify(s)}`);
  return v;
}

export type SynonymHit = { slug: SubstanceSlug; aliasMatched: string; isCanonical: boolean };

export type SynonymIndex = {
  /** Maps lowercased alias/name → set of slugs that own that alias. */
  byAlias: Map<string, SubstanceSlug[]>;
  /** Returns all hits for a query (ambiguous when length > 1). */
  resolve(query: string): SynonymHit[];
};

export function buildSynonymIndex(dataset: LeanDataset): SynonymIndex {
  const byAlias = new Map<string, SubstanceSlug[]>();

  function record(key: string, slug: SubstanceSlug): void {
    const k = key.toLowerCase().trim();
    if (!k) return;
    const existing = byAlias.get(k);
    if (existing) {
      if (!existing.includes(slug)) existing.push(slug);
    } else {
      byAlias.set(k, [slug]);
    }
  }

  for (const [name, sub] of Object.entries(dataset)) {
    const slug = validateSlug(name);
    if (!slug) continue;
    record(name, slug);
    record(sub.pretty_name, slug);
    for (const alias of sub.aliases) record(alias, slug);
  }

  function resolve(query: string): SynonymHit[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const slugs = byAlias.get(q) ?? [];
    return slugs.map((slug) => ({
      slug,
      aliasMatched: q,
      isCanonical: q === slug,
    }));
  }

  return { byAlias, resolve };
}
