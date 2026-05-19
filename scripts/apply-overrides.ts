#!/usr/bin/env bun
/**
 * apply-overrides.ts — CI gate for src/data/overrides.json.
 *
 * The override system lets us annotate or correct specific TripSit entries
 * without forking the upstream dataset. This script enforces the integrity
 * gate (PLAN.md Eng E2/F2):
 *
 *   - `applies_to_upstream_hash` in overrides.json MUST match the current
 *     commit in tripsit-pin.json. If they differ, every override needs
 *     re-review; the build fails until either the pin is reverted or the
 *     overrides field is updated.
 *
 *   - Each override target must reference a real entry in the lean dataset.
 *
 *   - Each `replace_severity` override's `original_severity` must match what
 *     the upstream currently has — otherwise we're overriding something that
 *     already changed.
 *
 *   - `expires_or_review_by` within 30 days emits a warning (not an error).
 *
 * Exits non-zero on validation failures.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LeanDataset, TripSitPin } from "../src/types.ts";
import type { OverrideFile } from "../src/lib/combo.ts";
import { isSeverity } from "../src/lib/severity.ts";

const dataDir = resolve(import.meta.dir, "..", "src", "data");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, name), "utf-8")) as T;
}

const pin = readJson<TripSitPin>("tripsit-pin.json");
const overrides = readJson<OverrideFile>("overrides.json");
const dataset = readJson<LeanDataset>("tripsit.lean.json");

const errors: string[] = [];
const warnings: string[] = [];

if (overrides.schema_version !== "1.0.0") {
  errors.push(`overrides.schema_version: expected "1.0.0", got ${JSON.stringify(overrides.schema_version)}`);
}

if (overrides.applies_to_upstream_hash !== pin.commit) {
  errors.push(
    `overrides.applies_to_upstream_hash mismatch:\n` +
      `    overrides.json: ${overrides.applies_to_upstream_hash}\n` +
      `    tripsit-pin.json: ${pin.commit}\n` +
      `  Every override needs re-review against the new upstream. See src/data/README.md "Re-pinning to a newer upstream".`,
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))?$/;

for (let i = 0; i < overrides.overrides.length; i++) {
  const o = overrides.overrides[i];
  if (!o) continue;
  const p = `overrides[${i}]`;

  if (!o.target || (o.target.type !== "combo" && o.target.type !== "substance")) {
    errors.push(`${p}.target.type: must be "combo" or "substance"`);
    continue;
  }
  if (typeof o.target.key !== "string" || o.target.key.length === 0) {
    errors.push(`${p}.target.key: must be non-empty string`);
    continue;
  }

  if (o.target.type === "combo") {
    const parts = o.target.key.split("+").map((s) => s.trim().toLowerCase());
    if (parts.length !== 2 || parts.some((p2) => !p2)) {
      errors.push(`${p}.target.key: combo target must be "substanceA+substanceB"`);
      continue;
    }
    const [a, b] = parts as [string, string];
    if (!dataset[a]) errors.push(`${p}.target.key: substance "${a}" not in dataset`);
    if (!dataset[b]) errors.push(`${p}.target.key: substance "${b}" not in dataset`);

    if (o.mode === "replace_severity") {
      const upstreamStatus = dataset[a]?.combos?.[b]?.status ?? dataset[b]?.combos?.[a]?.status;
      const original = o.payload["original_severity"];
      if (original && upstreamStatus && original !== upstreamStatus) {
        errors.push(
          `${p}: original_severity "${String(original)}" does not match upstream "${String(upstreamStatus)}" — upstream has changed since this override was added; needs re-review`,
        );
      }
      if (!isSeverity(o.payload["new_severity"])) {
        errors.push(`${p}.payload.new_severity: must be a valid Severity`);
      }
    }
  } else {
    if (!dataset[o.target.key]) {
      errors.push(`${p}.target.key: substance "${o.target.key}" not in dataset`);
    }
  }

  if (!o.mode || !["annotate", "replace_severity", "replace_note"].includes(o.mode)) {
    errors.push(`${p}.mode: must be "annotate" | "replace_severity" | "replace_note"`);
  }

  if (!o.justification) {
    errors.push(`${p}.justification: required`);
  } else {
    for (const field of ["source_url", "summary", "added_by", "added_at"] as const) {
      if (typeof o.justification[field] !== "string" || o.justification[field].length === 0) {
        errors.push(`${p}.justification.${field}: required non-empty string`);
      }
    }
    if (o.justification.added_at && !ISO_DATE.test(o.justification.added_at)) {
      errors.push(`${p}.justification.added_at: must be ISO8601`);
    }
  }

  if (typeof o.expires_or_review_by !== "string" || !ISO_DATE.test(o.expires_or_review_by)) {
    errors.push(`${p}.expires_or_review_by: must be ISO8601`);
  } else {
    const expiry = new Date(o.expires_or_review_by);
    const days = (expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (days < 0) {
      warnings.push(`${p}: expired ${Math.ceil(-days)} day(s) ago — needs re-review`);
    } else if (days < 30) {
      warnings.push(`${p}: expires in ${Math.ceil(days)} day(s) — flag for re-review soon`);
    }
  }
}

if (warnings.length > 0) {
  console.warn(`overrides.json: ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}

if (errors.length > 0) {
  console.error(`\noverrides.json: ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `overrides.json: ok (${overrides.overrides.length} override(s), pin ${pin.commit.slice(0, 8)})`,
);
