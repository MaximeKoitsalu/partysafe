#!/usr/bin/env bun
/**
 * lean-tripsit.ts — strip the raw TripSit dataset to only the fields partysafe renders.
 *
 * Why: bundle size (PLAN.md Eng F7). Raw is ~1.6 MB; lean is ~10-20% of that.
 *
 * What we keep:
 *  - name, pretty_name, aliases, categories
 *  - formatted_dose / formatted_duration / formatted_onset (for timeline + drug detail)
 *  - dose_note
 *  - properties.summary, properties["general-advice"] (for the per-drug factsheet)
 *  - combos[*].status (severity) + combos[*].note (used as fallback when no
 *    partysafe mechanism entry exists for the pair — see PLAN.md error registry)
 *
 * What we drop:
 *  - links, formatted_aftereffects, formatted_effects, pweffects (out of v1 scope)
 *  - properties.* except summary + general-advice (deep aliases/wiki/effects)
 *  - combos[*].sources (we ship our own citations; upstream is reachable via repo link)
 *
 * Usage:
 *   bun run scripts/lean-tripsit.ts
 *
 * Reads:  src/data/tripsit.raw.json  (gitignored; produced by fetch-tripsit.ts)
 * Writes: src/data/tripsit.lean.json (committed; the actual runtime asset)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type RawCombo = {
  status: string;
  note?: string;
  sources?: unknown;
};

type RawProperties = Record<string, unknown>;

type RawSubstance = {
  name?: string;
  pretty_name?: string;
  aliases?: string[];
  categories?: string[];
  dose_note?: string;
  formatted_dose?: Record<string, unknown>;
  formatted_duration?: { _unit?: string; value?: string };
  formatted_onset?: { _unit?: string; value?: string };
  combos?: Record<string, RawCombo>;
  properties?: RawProperties;
};

type LeanCombo = { status: string; note: string };
type LeanSubstance = {
  name: string;
  pretty_name: string;
  aliases: string[];
  categories: string[];
  dose_note?: string;
  formatted_dose?: Record<string, unknown>;
  formatted_duration?: { unit: string; value: string };
  formatted_onset?: { unit: string; value: string };
  summary?: string;
  general_advice?: string;
  combos?: Record<string, LeanCombo>;
};

const rawPath = resolve(import.meta.dir, "..", "src", "data", "tripsit.raw.json");
if (!existsSync(rawPath)) {
  console.error(`missing ${rawPath} — run scripts/fetch-tripsit.ts first`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(rawPath, "utf-8")) as Record<string, RawSubstance>;
const lean: Record<string, LeanSubstance> = {};

for (const [slug, v] of Object.entries(raw)) {
  if (!v.name || !v.pretty_name) continue;
  const out: LeanSubstance = {
    name: v.name,
    pretty_name: v.pretty_name,
    aliases: v.aliases ?? [],
    categories: v.categories ?? [],
  };
  if (v.dose_note) out.dose_note = v.dose_note;
  if (v.formatted_dose) out.formatted_dose = v.formatted_dose;
  if (v.formatted_duration?._unit && v.formatted_duration?.value) {
    out.formatted_duration = { unit: v.formatted_duration._unit, value: v.formatted_duration.value };
  }
  if (v.formatted_onset?._unit && v.formatted_onset?.value) {
    out.formatted_onset = { unit: v.formatted_onset._unit, value: v.formatted_onset.value };
  }
  if (v.properties && typeof v.properties === "object") {
    const props = v.properties as Record<string, unknown>;
    if (typeof props["summary"] === "string") out.summary = props["summary"];
    if (typeof props["general-advice"] === "string") out.general_advice = props["general-advice"];
  }
  if (v.combos) {
    const combos: Record<string, LeanCombo> = {};
    for (const [other, c] of Object.entries(v.combos)) {
      if (!c.status) continue;
      combos[other] = { status: c.status, note: c.note ?? "" };
    }
    if (Object.keys(combos).length > 0) out.combos = combos;
  }
  lean[slug] = out;
}

const leanPath = resolve(import.meta.dir, "..", "src", "data", "tripsit.lean.json");
const json = JSON.stringify(lean, null, 0) + "\n";
writeFileSync(leanPath, json);

const rawSize = readFileSync(rawPath).length;
const leanSize = json.length;
const pct = ((leanSize / rawSize) * 100).toFixed(1);
console.log(
  `lean: ${Object.keys(lean).length} substances · ${rawSize} → ${leanSize} bytes (${pct}% of raw)`,
);
