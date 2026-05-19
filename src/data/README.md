# `src/data/` — data layer

## What's here

| File | Role | Committed? |
|---|---|---|
| `SCHEMA.md` | Human-readable mechanisms.json schema (the public API) | yes |
| `SCHEMA.ts` | Runtime + build-time validator (single source of truth) | yes |
| `OVERRIDES_SCHEMA.md` | Schema for the overrides layer | yes |
| `tripsit-pin.json` | Pinned upstream commit hash + metadata | yes |
| `tripsit.lean.json` | Stripped TripSit dataset (the actual runtime asset) | yes |
| `tripsit.raw.json` | Full upstream pull (regenerated from pin) | **no** (gitignored) |
| `mechanisms.json` | Original mechanism content (the value) | yes |
| `overrides.json` | Safety annotations for known upstream disputes | yes |

## Pin procedure (rebuilding from upstream)

```bash
# 1. Refresh raw + pin metadata (uses commit pinned in fetch-tripsit.ts)
bun run scripts/fetch-tripsit.ts

# 2. Strip to the fields we render
bun run scripts/lean-tripsit.ts

# 3. Run gates: schema validator + overrides + mechanism lint
bun run validate

# 4. Run tests + build
bun test
bun run build
```

## Re-pinning to a newer upstream

This is a **review-required** operation. TripSit can change combo classifications
between pins; an entry that overrides previously may need re-review.

```bash
# 1. Pick a new commit from https://github.com/TripSit/drugs/commits/main
bun run scripts/fetch-tripsit.ts --commit=<sha>

# 2. Diff old vs new — look for changed `combos[]` entries on the 21 chart substances
diff <(jq -S . src/data/tripsit.raw.json) <(git show HEAD:src/data/tripsit.raw.json | jq -S .)
# (or scripts/diff-pin.ts, lands in v1.1)

# 3. For each combo whose status or note changed, decide whether existing overrides
#    in src/data/overrides.json still apply. If not, edit overrides.json:
#    - update `applies_to_upstream_hash` to match the new pin (build fails otherwise)
#    - OR remove the override if upstream now matches our position

# 4. Update the PIN constant in scripts/fetch-tripsit.ts to the new SHA

# 5. Re-run lean + validate + tests + build (as above)

# 6. Single atomic commit: pin bump + regenerated lean + reviewed overrides
```

The `applies_to_upstream_hash` gate (PLAN.md Eng F2) exists precisely so a pin
bump can't silently invalidate existing override metadata. If you re-pin without
re-reviewing each override, the build fails with a clear error pointing at
which override needs attention.

## Substances with combo data

Of the 555 substances in the TripSit dataset, only 21 carry `combos[]` data —
these are the substances on the canonical TripSit chart and are partysafe's
primary combo-planner audience:

```
alcohol, amt, caffeine, cannabis, cocaine, dextromethorphan, diphenhydramine,
dmt, ghb, ketamine, lithium, lsd, mdma, mephedrone, mescaline, mushrooms,
mxe, nitrous, pcp, pregabalin, tramadol
```

The remaining 534 substances ship with factsheet-only data (dose, duration,
onset, summary) for `/drug/[slug]` pages but cannot be selected in the combo
planner.

## Severity vocabulary

The six TripSit `combos[].status` values that partysafe inherits:

```
Low Risk & Synergy        — rendered as "Reported Synergy" in slate-blue
Low Risk & No Synergy     — blue
Low Risk & Decrease       — violet
Caution                   — amber
Unsafe                    — orange
Dangerous                 — red + diagonal stripe pattern overlay
```

The visual rendering deliberately demotes "Low Risk & Synergy" — see PLAN.md
Design D10 + CEO #25 for the rationale (screenshot misuse defense).
