/**
 * Region-aware emergency routing (PLAN.md Design D23, Eng E31).
 *
 * Design principles:
 *   - DO NOT assume the visitor is American. The universal default is 112 —
 *     the GSM standard emergency number, which routes to local emergency
 *     services on essentially any mobile phone, in any country, even with no
 *     SIM. 911 and 999 are region-specific, not universal.
 *   - Detect a likely region from `navigator.language`, but always treat it as
 *     a guess. The user can override it; the choice persists in localStorage.
 *   - Bare language tags with no region ("en", "fr") are ambiguous — they do
 *     NOT imply a country. They fall back to the universal 112.
 *   - Drug-specific support lines (Never Use Alone, NORS, etc.) are country-
 *     specific. We only surface a support line for the active region, never
 *     present a US-only number as a global default.
 *   - Never call out to a server — detection is client-side only.
 */

import type { EmergencyHotline, RegionCode, SupportLine } from "../types.ts";

const REGION_OVERRIDE_KEY = "ps-region-override-v1";

/** Region subtag (after the dash in a BCP-47 tag) → our RegionCode. */
const COUNTRY_TO_REGION: Record<string, RegionCode> = {
  US: "US",
  CA: "CA",
  GB: "GB",
  IE: "IE",
  AU: "AU",
  NZ: "NZ",
  IN: "IN",
  ZA: "ZA",
  BR: "PT-BR",
  // EU / EEA member states + Switzerland (all use 112)
  DE: "EU",
  AT: "EU",
  CH: "EU",
  FR: "EU",
  BE: "EU",
  ES: "EU",
  IT: "EU",
  NL: "EU",
  PT: "EU",
  EE: "EU",
  LV: "EU",
  LT: "EU",
  FI: "EU",
  SE: "EU",
  NO: "EU",
  DK: "EU",
  IS: "EU",
  PL: "EU",
  CZ: "EU",
  SK: "EU",
  HU: "EU",
  RO: "EU",
  BG: "EU",
  GR: "EU",
  HR: "EU",
  SI: "EU",
  LU: "EU",
  MT: "EU",
  CY: "EU",
};

const PRIMARY_HOTLINE: Record<RegionCode, EmergencyHotline> = {
  US: { region: "US", label: "Call 911", tel: "911", description: "United States" },
  CA: { region: "CA", label: "Call 911", tel: "911", description: "Canada" },
  GB: { region: "GB", label: "Call 999", tel: "999", description: "United Kingdom (or 112)" },
  IE: { region: "IE", label: "Call 112", tel: "112", description: "Ireland (or 999)" },
  EU: { region: "EU", label: "Call 112", tel: "112", description: "European emergency number" },
  "PT-BR": { region: "PT-BR", label: "Call 192", tel: "192", description: "Brazil (SAMU); 190 police" },
  AU: { region: "AU", label: "Call 000", tel: "000", description: "Australia (or 112 on mobile)" },
  NZ: { region: "NZ", label: "Call 111", tel: "111", description: "New Zealand" },
  IN: { region: "IN", label: "Call 112", tel: "112", description: "India (unified emergency)" },
  ZA: { region: "ZA", label: "Call 112", tel: "112", description: "South Africa (mobile); 10177 ambulance" },
  OTHER: {
    region: "OTHER",
    label: "Call 112",
    tel: "112",
    description: "Works on most mobile phones worldwide, even with no SIM",
  },
};

/**
 * Country-specific overdose / crisis support lines. These supplement — never
 * replace — the emergency number. Only the active region's line is surfaced as
 * a suggestion; the full set is browsable in the emergency view.
 */
const SUPPORT_LINES: SupportLine[] = [
  {
    region: "US",
    name: "Never Use Alone",
    tel: "18004843731",
    display: "1-800-484-3731",
    note: "Stays on the line while you use; sends help if you stop responding.",
  },
  {
    region: "US",
    name: "Poison Control",
    tel: "18002221222",
    display: "1-800-222-1222",
  },
  {
    region: "CA",
    name: "National Overdose Response Service (NORS)",
    tel: "18886886677",
    display: "1-888-688-6677",
    note: "Canada-wide; stays on the line while you use.",
  },
  {
    region: "GB",
    name: "Samaritans",
    tel: "116123",
    display: "116 123",
    note: "UK + Ireland; 24/7 crisis support (not overdose-specific).",
  },
  {
    region: "IE",
    name: "Samaritans",
    tel: "116123",
    display: "116 123",
    note: "Ireland + UK; 24/7 crisis support.",
  },
  {
    region: "AU",
    name: "National Alcohol & Other Drug Hotline",
    tel: "1800250015",
    display: "1800 250 015",
    note: "Australia-wide.",
  },
];

/** Human-readable region names for the picker. */
export const REGION_NAMES: Record<RegionCode, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IE: "Ireland",
  EU: "Europe (EU/EEA + Switzerland)",
  "PT-BR": "Brazil",
  AU: "Australia",
  NZ: "New Zealand",
  IN: "India",
  ZA: "South Africa",
  OTHER: "Elsewhere / not sure",
};

/** Ordered list of regions for the picker UI (universal option last). */
export const ALL_REGIONS: RegionCode[] = [
  "EU",
  "US",
  "GB",
  "IE",
  "CA",
  "AU",
  "NZ",
  "PT-BR",
  "IN",
  "ZA",
  "OTHER",
];

export const UNIVERSAL_NOTE =
  "112 is the international standard: on most mobile networks worldwide it connects you to local emergency services, even with no SIM or a locked phone. 911 (North America), 999 (UK), 000 (Australia) also work in their regions.";

/**
 * Detect a likely region from a BCP-47 language tag. This is a GUESS, never
 * authoritative. A bare language with no country subtag ("en", "fr") does not
 * imply a country and falls back to the universal 112.
 */
export function detectRegion(lang: string | undefined): RegionCode {
  if (!lang) return "OTHER";
  const norm = lang.replace(/_/g, "-");
  const parts = norm.split("-");
  // Find the region/country subtag: a 2-letter uppercase (or any-case) chunk
  // after the primary language. e.g. "en-US" → "US", "pt-BR" → "BR".
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    if (seg && seg.length === 2) {
      const region = COUNTRY_TO_REGION[seg.toUpperCase()];
      if (region) return region;
    }
  }
  // No usable country subtag → do NOT assume a country. Universal fallback.
  return "OTHER";
}

/** Read a persisted manual region override, if the user set one. */
export function getRegionOverride(): RegionCode | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    const raw = localStorage.getItem(REGION_OVERRIDE_KEY);
    if (raw && raw in PRIMARY_HOTLINE) return raw as RegionCode;
  } catch {
    // localStorage can throw in private mode / disabled storage — ignore.
  }
  return undefined;
}

/** Persist a manual region override. Pass undefined to clear it. */
export function setRegionOverride(region: RegionCode | undefined): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (region) localStorage.setItem(REGION_OVERRIDE_KEY, region);
    else localStorage.removeItem(REGION_OVERRIDE_KEY);
  } catch {
    // ignore storage failures
  }
}

/**
 * Resolve the active region: a manual override wins; otherwise detect from the
 * language tag. Always returns a concrete region (never undefined).
 */
export function resolveRegion(lang: string | undefined): {
  region: RegionCode;
  source: "override" | "detected" | "fallback";
} {
  const override = getRegionOverride();
  if (override) return { region: override, source: "override" };
  const detected = detectRegion(lang);
  return { region: detected, source: detected === "OTHER" ? "fallback" : "detected" };
}

export function primaryHotline(region: RegionCode): EmergencyHotline {
  return PRIMARY_HOTLINE[region];
}

/** Support lines for a region (empty array if none registered). */
export function supportLinesFor(region: RegionCode): SupportLine[] {
  return SUPPORT_LINES.filter((s) => s.region === region);
}

/**
 * Resolve the emergency surface for a language tag (honoring any override):
 *   - primary: the region's emergency number
 *   - support: that region's drug/crisis support lines (may be empty)
 *   - region/source: for UI labeling + the picker
 */
export function resolveHotlines(lang: string | undefined): {
  region: RegionCode;
  source: "override" | "detected" | "fallback";
  primary: EmergencyHotline;
  support: SupportLine[];
} {
  const { region, source } = resolveRegion(lang);
  return {
    region,
    source,
    primary: primaryHotline(region),
    support: supportLinesFor(region),
  };
}
