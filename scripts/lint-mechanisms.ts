#!/usr/bin/env bun
/**
 * lint-mechanisms.ts — content-level lint on src/data/mechanisms.json.
 *
 * The schema validator (scripts/validate-mechanisms.ts) checks SHAPE.
 * This script checks CONTENT QUALITY:
 *  - reading level (banned phrases that indicate safety theater)
 *  - word counts within the schema bounds (validator handles the upper bound;
 *    we add a lower bound so entries don't ship as one-liner stubs)
 *  - banned phrases that erode harm-reduction posture ("safe", "fine", "no risk")
 *  - severity / first-aid consistency: severity >= Unsafe should route to
 *    "call 911" rather than enumerating multiple specific first-aid steps
 *  - citation hygiene: at least one citation must be a non-TripSit source so
 *    we're not just paraphrasing one upstream
 *
 * Exits non-zero on violations.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateMechanismFile } from "../src/data/SCHEMA.ts";

const BANNED_PHRASES = [
  "is safe",
  "are safe",
  "totally fine",
  "no risk",
  "no problem",
  "should be okay",
  "should be fine",
  "is okay",
  "are okay",
  "harmless",
  "perfectly safe",
];

const MIN_PROSE_WORDS = 25;
const MIN_WARNING_SIGNS = 2;
const MIN_FIRST_AID = 1;

const path = resolve(import.meta.dir, "..", "src", "data", "mechanisms.json");
const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;

const result = validateMechanismFile(raw, { allowUnreviewed: true });
if (!result.valid) {
  console.error("lint-mechanisms: cannot lint — schema validation failed first.");
  console.error("Run `bun run scripts/validate-mechanisms.ts --allow-unreviewed` for details.");
  process.exit(1);
}

const errors: string[] = [];
const warnings: string[] = [];

function wc(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

for (let i = 0; i < result.file.entries.length; i++) {
  const e = result.file.entries[i];
  if (!e) continue;
  const p = `entries[${i}] (${e.id})`;

  for (const [loc, content] of Object.entries(e.locales)) {
    const lp = `${p}.locales.${loc}`;
    const prose = content.mechanism_prose;
    const lc = prose.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lc.includes(phrase)) {
        errors.push(`${lp}: prose contains banned phrase "${phrase}"`);
      }
    }
    if (wc(prose) < MIN_PROSE_WORDS) {
      errors.push(`${lp}.mechanism_prose: ${wc(prose)} words (min ${MIN_PROSE_WORDS})`);
    }
    if (content.warning_signs.length < MIN_WARNING_SIGNS) {
      errors.push(
        `${lp}.warning_signs: ${content.warning_signs.length} (min ${MIN_WARNING_SIGNS})`,
      );
    }
    if (content.first_aid.length < MIN_FIRST_AID) {
      errors.push(`${lp}.first_aid: ${content.first_aid.length} (min ${MIN_FIRST_AID})`);
    }

    // For severe entries, encourage routing to professional care rather than
    // enumerating multiple specific first-aid steps (PLAN.md Design C6 spirit).
    if (
      (e.severity === "Unsafe" || e.severity === "Dangerous") &&
      content.first_aid.length > 0
    ) {
      const lastStep = content.first_aid[content.first_aid.length - 1] ?? "";
      if (!/911|112|999|emergency|hotline/i.test(lastStep)) {
        warnings.push(
          `${lp}: severity is ${e.severity} but the last first-aid step does not mention emergency services`,
        );
      }
    }
  }

  // Citation hygiene
  const sources = e.sources.map((s) => s.source.toLowerCase());
  if (sources.length === 1 && sources[0]?.includes("tripsit")) {
    warnings.push(
      `${p}.sources: only TripSit cited; add at least one independent source (DanceSafe, Erowid, PsychonautWiki, peer-reviewed) before clinical review`,
    );
  }
}

if (warnings.length > 0) {
  console.warn(`lint-mechanisms: ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}

if (errors.length > 0) {
  console.error(`\nlint-mechanisms: ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`lint-mechanisms: ok (${result.file.entries.length} entries)`);
