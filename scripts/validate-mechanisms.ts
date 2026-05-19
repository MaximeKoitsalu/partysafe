#!/usr/bin/env bun
/**
 * validate-mechanisms.ts — CI gate for src/data/mechanisms.json.
 *
 * Runs the validator from src/data/SCHEMA.ts against the committed file.
 * Exits non-zero with human-readable errors when the file is invalid.
 *
 * Usage:
 *   bun run scripts/validate-mechanisms.ts                  # strict (requires reviewers)
 *   bun run scripts/validate-mechanisms.ts --allow-unreviewed
 *     # Allow entries with empty reviewed_by[] — for pre-clinical-review
 *     # development. Production builds run without this flag (PLAN.md ship gate).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateMechanismFile } from "../src/data/SCHEMA.ts";

const allowUnreviewed = process.argv.includes("--allow-unreviewed");
const path = resolve(import.meta.dir, "..", "src", "data", "mechanisms.json");
const raw = readFileSync(path, "utf-8");

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`mechanisms.json: failed to parse — ${(err as Error).message}`);
  process.exit(1);
}

const result = validateMechanismFile(parsed, { allowUnreviewed });

if (result.warnings.length > 0) {
  console.warn(`mechanisms.json: ${result.warnings.length} warning(s):`);
  for (const w of result.warnings) console.warn(`  ⚠ ${w}`);
}

if (!result.valid) {
  console.error(`\nmechanisms.json: ${result.errors.length} error(s):`);
  for (const e of result.errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`mechanisms.json: ok (${result.file.entries.length} entries)`);
