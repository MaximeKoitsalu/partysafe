/**
 * Core types shared across partysafe.
 *
 * Re-exports SCHEMA.ts types for the public API surface; adds branded types
 * for runtime safety (SubstanceSlug) and the lean TripSit shape.
 */

import type {
  Category,
  Citation,
  LocalizedContent,
  MechanismEntry,
  MechanismFile,
  ReviewerRef,
  Severity,
  ValidationResult,
} from "./data/SCHEMA.ts";

export type {
  Category,
  Citation,
  LocalizedContent,
  MechanismEntry,
  MechanismFile,
  ReviewerRef,
  Severity,
  ValidationResult,
};

/**
 * Branded type for substance slugs. Only constructible via `validateSlug()`
 * (in lib/synonyms.ts), so anywhere the codebase consumes a `SubstanceSlug`
 * the value has passed `/^[a-z0-9-]+$/`. This is the XSS defense for hash
 * route params and picker input (PLAN.md Eng E15/F11).
 */
declare const SubstanceSlugBrand: unique symbol;
export type SubstanceSlug = string & { readonly [SubstanceSlugBrand]: true };

/** Lean TripSit substance entry as emitted by scripts/lean-tripsit.ts */
export type LeanSubstance = {
  name: string;
  pretty_name: string;
  aliases: string[];
  categories: string[];
  dose_note?: string;
  formatted_dose?: Record<string, unknown>;
  /** `route` is set when the value came from a route-specific (ROA) field. */
  formatted_duration?: { unit: string; value: string; route?: string };
  formatted_onset?: { unit: string; value: string; route?: string };
  summary?: string;
  general_advice?: string;
  combos?: Record<string, { status: string; note: string }>;
};

/** Lean TripSit dataset (the runtime asset). */
export type LeanDataset = Record<string, LeanSubstance>;

/** TripSit pin metadata. */
export type TripSitPin = {
  upstream: string;
  commit: string;
  fetched_at: string;
  substance_count: number;
};

/**
 * Pairwise risk for a selected substance pair. Returned by lib/combo.ts
 * to render each tile in the combo grid.
 */
export type PairwiseRisk = {
  a: SubstanceSlug;
  b: SubstanceSlug;
  /** TripSit's upstream status for this pair, if it exists. */
  upstream_status?: Severity;
  /** Upstream combo note (used as fallback when no mechanism entry exists). */
  upstream_note?: string;
  /** partysafe-authored mechanism entry, if one matches the category pattern. */
  mechanism?: MechanismEntry;
  /** Applied override, if any. Annotated in UI per Design D19. */
  override?: AppliedOverride;
  /** Resolved severity after override application. */
  severity?: Severity;
};

export type AppliedOverride = {
  mode: "annotate" | "replace_severity" | "replace_note";
  label?: string;
  popover?: string;
  original_severity?: Severity;
  source_url: string;
};

/** Aggregate result for a multi-substance selection. */
export type ComboAnalysis = {
  pairs: PairwiseRisk[];
  /**
   * Single worst-case severity across all pairs, or undefined if no pair has
   * any data. When `cumulative_warning` is true the UI replaces the worst-case
   * banner with a black "cumulative not modeled" warning (PLAN.md Design D7).
   */
  worst_case?: Severity;
  /**
   * True when 3 or more substances are selected. The pairwise tiles still
   * render but the worst-case banner is replaced with a pharmacological-
   * honesty warning (PLAN.md Eng E30, Design C3).
   */
  cumulative_warning: boolean;
};

/** Region code for emergency hotline routing. */
export type RegionCode =
  | "US"
  | "CA"
  | "GB"
  | "IE"
  | "EU"
  | "PT-BR"
  | "AU"
  | "NZ"
  | "IN"
  | "ZA"
  | "OTHER";

export type EmergencyHotline = {
  region: RegionCode;
  label: string;
  tel: string;
  description?: string;
};

/** A drug-specific / crisis support line (distinct from the emergency number). */
export type SupportLine = {
  region: RegionCode;
  name: string;
  tel: string;
  display: string;
  note?: string;
};
