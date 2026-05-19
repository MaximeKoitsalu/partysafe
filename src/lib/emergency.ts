/**
 * Region-detected emergency hotline routing (PLAN.md Design D23, Eng E31).
 *
 * Strategy:
 *   - Read `navigator.language` (or a passed override for testing).
 *   - Map BCP-47 language tag → primary hotline (911 / 112 / 999 / 192 / 000 / 111).
 *   - Surface a fallback list so users can self-select if detection guesses wrong.
 *   - Never call out to a server — region detection happens client-side only.
 *
 * The Never Use Alone hotline is US-only; we surface it only when region is US
 * or unknown, and the dedicated /emergency view lists alternatives for other
 * regions.
 */

import type { EmergencyHotline, RegionCode } from "../types.ts";

const LANGUAGE_TO_REGION: Record<string, RegionCode> = {
  // North America
  "en-US": "US",
  "en-CA": "CA",
  "fr-CA": "CA",
  // United Kingdom + Ireland
  "en-GB": "GB",
  "en-IE": "GB",
  // EU primary languages → 112
  "de-DE": "EU",
  "de-AT": "EU",
  "de-CH": "EU",
  "fr-FR": "EU",
  "fr-BE": "EU",
  "es-ES": "EU",
  "it-IT": "EU",
  "nl-NL": "EU",
  "nl-BE": "EU",
  "pt-PT": "EU",
  "et-EE": "EU",
  "fi-FI": "EU",
  "sv-SE": "EU",
  "da-DK": "EU",
  "pl-PL": "EU",
  "cs-CZ": "EU",
  "el-GR": "EU",
  // Brazil
  "pt-BR": "PT-BR",
  // Antipodes
  "en-AU": "AU",
  "en-NZ": "NZ",
};

const PRIMARY_HOTLINE: Record<RegionCode, EmergencyHotline> = {
  US: {
    region: "US",
    label: "Call 911 (US)",
    tel: "911",
    description: "United States emergency services",
  },
  CA: { region: "CA", label: "Call 911 (Canada)", tel: "911" },
  GB: { region: "GB", label: "Call 999 (UK)", tel: "999" },
  EU: { region: "EU", label: "Call 112 (EU)", tel: "112", description: "European emergency number" },
  "PT-BR": { region: "PT-BR", label: "Call 192 (Brazil SAMU)", tel: "192" },
  AU: { region: "AU", label: "Call 000 (Australia)", tel: "000" },
  NZ: { region: "NZ", label: "Call 111 (New Zealand)", tel: "111" },
  OTHER: {
    region: "OTHER",
    label: "Call 911 / 112",
    tel: "911",
    description: "Try the primary emergency number for your region",
  },
};

const ALTERNATE_HOTLINES: EmergencyHotline[] = [
  { region: "US", label: "Never Use Alone (US)", tel: "18004843731", description: "1-800-484-3731" },
  { region: "US", label: "Poison Control (US)", tel: "18002221222", description: "1-800-222-1222" },
  { region: "GB", label: "Samaritans (UK + IE)", tel: "116123" },
];

export function detectRegion(lang: string | undefined): RegionCode {
  if (!lang) return "OTHER";
  const norm = lang.replace(/_/g, "-");
  // Exact match first
  const exact = LANGUAGE_TO_REGION[norm];
  if (exact) return exact;
  // Language-only fallback: "en" → US, "fr" → EU, etc.
  const langOnly = norm.split("-")[0]?.toLowerCase();
  if (langOnly === "en") return "US";
  if (langOnly === "fr" || langOnly === "de" || langOnly === "es" || langOnly === "it") return "EU";
  if (langOnly === "pt") return "EU"; // Portuguese (Portugal) default; BR users will have pt-BR
  return "OTHER";
}

export function primaryHotline(region: RegionCode): EmergencyHotline {
  return PRIMARY_HOTLINE[region];
}

/**
 * Resolve the full hotline list for a given language tag:
 *  - primary[0] is the detected region's emergency number
 *  - alternates include Never Use Alone (US/global) + region-specific extras
 */
export function resolveHotlines(lang: string | undefined): {
  primary: EmergencyHotline;
  alternates: EmergencyHotline[];
} {
  const region = detectRegion(lang);
  const primary = primaryHotline(region);
  const alternates: EmergencyHotline[] = [];
  for (const h of ALTERNATE_HOTLINES) {
    if (h.region === region || region === "OTHER") alternates.push(h);
  }
  // If we already picked a regional primary, also offer Never Use Alone (US-funded
  // but answers internationally as of 2026 — confirm before launch with their team).
  if (region !== "US" && !alternates.find((h) => h.label.startsWith("Never Use"))) {
    const nua = ALTERNATE_HOTLINES[0];
    if (nua) alternates.push(nua);
  }
  return { primary, alternates };
}
