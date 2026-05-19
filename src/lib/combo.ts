/**
 * Combo analysis — the central business logic.
 *
 * Given a list of substance slugs, build:
 *  - every pairwise risk (N choose 2)
 *  - for each pair: upstream TripSit severity + note, partysafe mechanism
 *    (looked up by category pattern), applied override (if any), and the
 *    resolved final severity
 *  - aggregate worst-case severity across pairs
 *  - cumulative-warning flag when N >= 3 (PLAN.md Eng E30)
 *
 * Pure function: takes the dataset + mechanism file + overrides + selection,
 * returns the ComboAnalysis. No I/O.
 *
 * Naming (PLAN.md Eng E32): `pairwiseRisksFor` over `comboFor` (clearer that
 * it's the pairwise decomposition); `aggregateSeverity` over `worstCase`
 * (clearer that it's the max across pairs, not a single special pair).
 */

import type {
  AppliedOverride,
  ComboAnalysis,
  LeanDataset,
  MechanismEntry,
  MechanismFile,
  PairwiseRisk,
  Severity,
  SubstanceSlug,
} from "../types.ts";
import { isSeverity, maxSeverity } from "./severity.ts";
import { candidatePatterns, pharmacologicalCategories } from "./category-pattern.ts";

/**
 * Override schema as parsed from src/data/overrides.json. Kept here (rather
 * than in SCHEMA.ts) because it's an internal merge concern, not part of the
 * public mechanism API.
 */
export type OverrideFile = {
  schema_version: "1.0.0";
  applies_to_upstream_hash: string;
  overrides: OverrideEntry[];
};

export type OverrideEntry = {
  target: { type: "combo" | "substance"; key: string };
  mode: "annotate" | "replace_severity" | "replace_note";
  payload: Record<string, unknown>;
  justification: { source_url: string; summary: string; added_by: string; added_at: string };
  expires_or_review_by: string;
};

/** Build an index keyed by `category_pattern|severity` → MechanismEntry for O(1) lookup. */
export function indexMechanisms(file: MechanismFile): Map<string, MechanismEntry> {
  const map = new Map<string, MechanismEntry>();
  for (const e of file.entries) {
    map.set(`${e.category_pattern}|${e.severity}`, e);
  }
  return map;
}

/** Build a combo-target index keyed by lexicographically-ordered pair slug. */
export function indexOverrides(file: OverrideFile): Map<string, OverrideEntry> {
  const map = new Map<string, OverrideEntry>();
  for (const o of file.overrides) {
    if (o.target.type !== "combo") continue;
    // Normalize key: split on '+', sort, rejoin
    const parts = o.target.key.split("+").map((s) => s.trim().toLowerCase()).sort();
    map.set(parts.join("+"), o);
  }
  return map;
}

function pairKey(a: SubstanceSlug, b: SubstanceSlug): string {
  return a <= b ? `${a}+${b}` : `${b}+${a}`;
}

function readUpstreamCombo(
  dataset: LeanDataset,
  a: SubstanceSlug,
  b: SubstanceSlug,
): { status?: Severity; note?: string } {
  const subA = dataset[a];
  if (!subA?.combos) return {};
  const combo = subA.combos[b];
  if (!combo) {
    // Try the reverse direction — TripSit usually has symmetric entries but
    // not always.
    const subB = dataset[b];
    if (!subB?.combos) return {};
    const reverse = subB.combos[a];
    if (!reverse) return {};
    return {
      ...(isSeverity(reverse.status) && { status: reverse.status }),
      ...(reverse.note && { note: reverse.note }),
    };
  }
  return {
    ...(isSeverity(combo.status) && { status: combo.status }),
    ...(combo.note && { note: combo.note }),
  };
}

function lookupMechanism(
  mechIndex: Map<string, MechanismEntry>,
  a: SubstanceSlug,
  b: SubstanceSlug,
  dataset: LeanDataset,
  severity: Severity | undefined,
): MechanismEntry | undefined {
  if (!severity) return undefined;
  const subA = dataset[a];
  const subB = dataset[b];
  if (!subA || !subB) return undefined;
  const catsA = pharmacologicalCategories(subA.categories);
  const catsB = pharmacologicalCategories(subB.categories);
  for (const pattern of candidatePatterns(catsA, catsB)) {
    const hit = mechIndex.get(`${pattern}|${severity}`);
    if (hit) return hit;
  }
  return undefined;
}

function applyOverride(
  overrides: Map<string, OverrideEntry> | undefined,
  a: SubstanceSlug,
  b: SubstanceSlug,
  upstreamSeverity: Severity | undefined,
): { severity: Severity | undefined; override: AppliedOverride | undefined } {
  if (!overrides) return { severity: upstreamSeverity, override: undefined };
  const key = pairKey(a, b);
  const o = overrides.get(key);
  if (!o) return { severity: upstreamSeverity, override: undefined };
  if (o.mode === "annotate") {
    const label = typeof o.payload["label"] === "string" ? o.payload["label"] : "disputed";
    const popover = typeof o.payload["popover"] === "string" ? o.payload["popover"] : o.justification.summary;
    return {
      severity: upstreamSeverity,
      override: { mode: "annotate", label, popover, source_url: o.justification.source_url },
    };
  }
  if (o.mode === "replace_severity") {
    const next = o.payload["new_severity"];
    if (!isSeverity(next)) {
      return { severity: upstreamSeverity, override: undefined };
    }
    const orig = isSeverity(o.payload["original_severity"]) ? o.payload["original_severity"] : upstreamSeverity;
    return {
      severity: next,
      override: {
        mode: "replace_severity",
        ...(isSeverity(orig) && { original_severity: orig }),
        source_url: o.justification.source_url,
        popover: o.justification.summary,
      },
    };
  }
  if (o.mode === "replace_note") {
    return {
      severity: upstreamSeverity,
      override: {
        mode: "replace_note",
        source_url: o.justification.source_url,
        popover: o.justification.summary,
      },
    };
  }
  return { severity: upstreamSeverity, override: undefined };
}

export type ComboInputs = {
  dataset: LeanDataset;
  mechanisms: MechanismFile;
  overrides?: OverrideFile;
};

/**
 * Compute the pairwise risk + aggregate analysis for a substance selection.
 *
 * Invariants:
 *  - selection is assumed to be deduplicated and capped to 4 by the caller
 *    (router + picker both enforce this). If 5+ are passed, the function
 *    still works but the cumulative warning fires.
 *  - returns an empty pairs array when fewer than 2 substances are selected.
 */
export function pairwiseRisksFor(
  selection: SubstanceSlug[],
  inputs: ComboInputs,
): ComboAnalysis {
  const mechIndex = indexMechanisms(inputs.mechanisms);
  const overrideIndex = inputs.overrides ? indexOverrides(inputs.overrides) : undefined;

  const pairs: PairwiseRisk[] = [];
  for (let i = 0; i < selection.length; i++) {
    for (let j = i + 1; j < selection.length; j++) {
      const a = selection[i];
      const b = selection[j];
      if (!a || !b) continue;
      const upstream = readUpstreamCombo(inputs.dataset, a, b);
      const { severity, override } = applyOverride(overrideIndex, a, b, upstream.status);
      const mechanism = lookupMechanism(mechIndex, a, b, inputs.dataset, severity);
      const pair: PairwiseRisk = {
        a,
        b,
        ...(upstream.status && { upstream_status: upstream.status }),
        ...(upstream.note && { upstream_note: upstream.note }),
        ...(severity && { severity }),
        ...(mechanism && { mechanism }),
        ...(override && { override }),
      };
      pairs.push(pair);
    }
  }

  const severities = pairs
    .map((p) => p.severity)
    .filter((s): s is Severity => Boolean(s));
  const worst = maxSeverity(severities);

  const result: ComboAnalysis = {
    pairs,
    cumulative_warning: hasCumulativeRisk(selection),
    ...(worst && { worst_case: worst }),
  };
  return result;
}

/**
 * Cumulative-risk predicate (PLAN.md Eng E30). Simple N>=3 in v1; future
 * versions may add category-mix gating once a pharmacology consult exists.
 */
export function hasCumulativeRisk(selection: SubstanceSlug[]): boolean {
  return selection.length >= 3;
}

/**
 * Resolve a final severity for the UI to render the worst-case banner.
 * When `cumulative_warning` is set, the UI replaces the banner entirely with
 * the black "cumulative risk not modeled" warning bar — but the value here
 * is still useful for sort-pairs-by-severity-descending behavior.
 */
export function aggregateSeverity(analysis: ComboAnalysis): Severity | undefined {
  return analysis.worst_case;
}
