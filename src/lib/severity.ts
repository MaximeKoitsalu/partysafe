/**
 * Severity ranking, color/icon/pattern token map, and comparators.
 *
 * Single source of truth for severity ordering — used by combo.ts to compute
 * `aggregateSeverity` (worst-of-pairs) and by SeverityChip to render the
 * locked design tokens (PLAN.md Design D2, Eng E29-E32).
 *
 * The chip rendering invariant is type-enforced: `SEVERITY_TOKENS` requires
 * every Severity to have color/icon/pattern/qualifier defined. The compiler
 * fails the build if a token is missing.
 */

import { SEVERITY_LABELS, type Severity } from "../data/SCHEMA.ts";

export { SEVERITY_LABELS };
export type { Severity };

/**
 * Severity rank — lower index = lower risk. `aggregateSeverity` picks the
 * MAX rank across pairs. Order matches the design D2 spec:
 * Reported Synergy is intentionally NOT the "highest safety" — it is
 * "lowest risk + an interaction worth noting" (PLAN.md Design D10).
 */
export const SEVERITY_ORDER: Record<Severity, number> = {
  "Low Risk & Synergy": 0,
  "Low Risk & No Synergy": 1,
  "Low Risk & Decrease": 2,
  Caution: 3,
  Unsafe: 4,
  Dangerous: 5,
};

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

export function maxSeverity(severities: Severity[]): Severity | undefined {
  if (severities.length === 0) return undefined;
  let max = severities[0] as Severity;
  for (let i = 1; i < severities.length; i++) {
    const s = severities[i] as Severity;
    if (compareSeverity(s, max) > 0) max = s;
  }
  return max;
}

export type SeverityTone = "neutral" | "info" | "soft" | "warn" | "alert" | "danger";

export type SeverityToken = {
  /** Display label used in the UI. "Reported Synergy" intentionally replaces
   *  TripSit's "Low Risk & Synergy" to avoid the green-check misuse vector. */
  label: string;
  /** CSS custom property name. Maps to tokens in src/styles/tailwind.css. */
  cssVar: string;
  /** Shape-distinct icon glyph (color-blind safety). */
  icon: string;
  /** Tone tag for component grouping. */
  tone: SeverityTone;
  /** True when the chip must render a pattern overlay (not color alone). */
  pattern: boolean;
  /** Mandatory qualifier text rendered inside every chip (Design D11). */
  qualifier: string;
};

/**
 * Type-enforced token map. The compiler fails if a Severity is missing from
 * this record (PLAN.md Eng E29).
 */
export const SEVERITY_TOKENS: Record<Severity, SeverityToken> = {
  "Low Risk & Synergy": {
    label: "Reported Synergy",
    cssVar: "--color-sev-synergy",
    icon: "ⓘ",
    tone: "neutral",
    pattern: false,
    qualifier: "Varies with dose, set, setting, body, batch.",
  },
  "Low Risk & No Synergy": {
    label: "Low Risk",
    cssVar: "--color-sev-low-no-syn",
    icon: "✓",
    tone: "info",
    pattern: false,
    qualifier: "Varies with dose, set, setting, body, batch.",
  },
  "Low Risk & Decrease": {
    label: "Low / Decrease",
    cssVar: "--color-sev-low-decrease",
    icon: "↓",
    tone: "soft",
    pattern: false,
    qualifier: "Varies with dose, set, setting, body, batch.",
  },
  Caution: {
    label: "Caution",
    cssVar: "--color-sev-caution",
    icon: "⚠",
    tone: "warn",
    pattern: false,
    qualifier: "Varies with dose, set, setting, body. Read the mechanism.",
  },
  Unsafe: {
    label: "Unsafe",
    cssVar: "--color-sev-unsafe",
    icon: "⊘",
    tone: "alert",
    pattern: false,
    qualifier: "Significant risk. Read the mechanism. In an emergency, call 911 / 112.",
  },
  Dangerous: {
    label: "Dangerous",
    cssVar: "--color-sev-dangerous",
    icon: "☠",
    tone: "danger",
    pattern: true, // diagonal stripe overlay survives B&W + color-blind
    qualifier: "Serious risk of harm or death. In an emergency, call 911 / 112.",
  },
};

/**
 * Look up the display token for a severity. Throws on invalid input — callers
 * are expected to pass values that have already been validated by the schema
 * or the loader, so an exception here indicates a programmer error.
 */
export function tokenFor(severity: Severity): SeverityToken {
  const t = SEVERITY_TOKENS[severity];
  if (!t) {
    throw new Error(`unknown severity: ${String(severity)}`);
  }
  return t;
}

export function isSeverity(v: unknown): v is Severity {
  return typeof v === "string" && v in SEVERITY_ORDER;
}
