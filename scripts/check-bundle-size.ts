/**
 * Bundle-size gate (PLAN.md Eng E7 / F7). Fails CI if a built asset exceeds its
 * gzipped budget. No dependency on the `bundlesize` package — bun has gzipSync.
 *
 * Budgets are deliberate: the JS/CSS budgets keep the cold-start fast on a
 * mid-tier phone over 3G; the data budget tracks the TripSit dataset.
 */
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve(import.meta.dir, "..", "dist", "assets");

// Budgets in KB (gzipped).
const BUDGETS: Array<{ match: RegExp; maxKb: number; label: string }> = [
  { match: /^index-.*\.js$/, maxKb: 100, label: "JS bundle" },
  { match: /^index-.*\.css$/, maxKb: 25, label: "CSS bundle" },
  { match: /^mechanisms-.*\.json$/, maxKb: 40, label: "mechanisms data" },
  { match: /^tripsit\.lean-.*\.json$/, maxKb: 150, label: "TripSit dataset" },
];

if (!existsSync(DIST)) {
  console.error(`check-bundle-size: ${DIST} not found — run \`bun run build\` first`);
  process.exit(1);
}

const files = readdirSync(DIST);
let failed = false;
const rows: string[] = [];

for (const budget of BUDGETS) {
  const file = files.find((f) => budget.match.test(f));
  if (!file) {
    rows.push(`  ?  ${budget.label}: no matching file (${budget.match})`);
    continue;
  }
  const raw = readFileSync(resolve(DIST, file));
  const gzKb = gzipSync(raw).length / 1024;
  const ok = gzKb <= budget.maxKb;
  if (!ok) failed = true;
  rows.push(
    `  ${ok ? "✓" : "✗"}  ${budget.label}: ${gzKb.toFixed(1)} KB gz (budget ${budget.maxKb} KB) — ${file}`,
  );
}

console.log("bundle-size gate:");
console.log(rows.join("\n"));

if (failed) {
  console.error("\nbundle-size gate FAILED — an asset exceeds its budget.");
  process.exit(1);
}
console.log("\nbundle-size gate: ok");
