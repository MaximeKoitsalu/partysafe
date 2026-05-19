#!/usr/bin/env bun
/**
 * fetch-tripsit.ts — pull the TripSit drugs dataset at a pinned commit.
 *
 * Usage:
 *   bun run scripts/fetch-tripsit.ts                       # use pinned commit
 *   bun run scripts/fetch-tripsit.ts --commit=<sha>        # re-pin (review needed!)
 *
 * Re-pinning checklist (PLAN.md Eng F1/F2 + CEO #4 trust posture):
 *   1. Diff old vs new drugs.json (especially `combos[]` for the 21 chart substances)
 *   2. Re-run scripts/apply-overrides.ts — any override whose `applies_to_upstream_hash`
 *      no longer matches will fail the build until reviewed
 *   3. Update the PIN constant below + src/data/tripsit-pin.json
 *   4. Run scripts/lean-tripsit.ts to regenerate the committed lean dataset
 *   5. Run bun test + bun run build → green
 *   6. Commit pin bump + regenerated lean + reviewed overrides as one atomic commit
 *
 * The raw dataset (~1.6 MB) is NOT committed; only the lean output is.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PIN = "a34c5afa424b72b2b3b06a1a2225326f2324529f";

const args = process.argv.slice(2);
const commitArg = args.find((a) => a.startsWith("--commit="));
const commit = commitArg ? commitArg.slice("--commit=".length) : PIN;

const url = `https://raw.githubusercontent.com/TripSit/drugs/${commit}/drugs.json`;
console.log(`fetching ${url}`);
const res = await fetch(url);
if (!res.ok) {
  console.error(`fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const text = await res.text();
const data = JSON.parse(text);
const count = Object.keys(data).length;

const outRaw = resolve(import.meta.dir, "..", "src", "data", "tripsit.raw.json");
writeFileSync(outRaw, text);
console.log(`wrote ${outRaw} (${text.length} bytes, ${count} substances)`);

const outPin = resolve(import.meta.dir, "..", "src", "data", "tripsit-pin.json");
writeFileSync(
  outPin,
  JSON.stringify(
    {
      upstream: "https://github.com/TripSit/drugs",
      commit,
      fetched_at: new Date().toISOString(),
      substance_count: count,
    },
    null,
    2,
  ) + "\n",
);
console.log(`wrote ${outPin}`);
