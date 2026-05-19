# `overrides.json` — schema

The overrides layer lets partysafe annotate or correct specific TripSit entries
without forking the upstream dataset. This is the safety net for known disputes
(MDMA + MAOI severity, cannabis combos, kratom interactions, etc.) and for
cases where partysafe's reviewer chain has reached a stronger conclusion than
the upstream community consensus.

## File shape

```jsonc
{
  "schema_version": "1.0.0",
  "applies_to_upstream_hash": "a34c5afa424b72b2b3b06a1a2225326f2324529f",
  "overrides": [ /* Override[] */ ]
}
```

## `Override`

```jsonc
{
  "target": {
    "type": "combo" | "substance",          // what is being overridden
    "key": "mdma+maoi" | "mdma"             // pair-slug or substance-slug
  },
  "mode": "annotate" | "replace_severity" | "replace_note",
  "payload": /* mode-dependent — see below */,
  "justification": {
    "source_url": "https://...",
    "summary": "Two PubMed reviews (2019, 2023) reclassify this as Dangerous on...",
    "added_by": "dr-jane-smith",
    "added_at": "2026-05-19"
  },
  "expires_or_review_by": "2027-05-19"      // ISO8601 date; build warns within 30d
}
```

### Modes

#### `annotate`

Adds a contextual note to the entry without changing severity or note text.
Renders as the "📌 Reviewed — disputed" inline pill (PLAN.md Design D19).

Payload:
```jsonc
{
  "label": "disputed",                // pill text
  "tone": "neutral" | "warning",       // pill color group
  "popover": "PubMed evidence suggests this is more dangerous than..."
}
```

#### `replace_severity`

Replaces the upstream severity for this combo. UI shows BOTH the new and old
severity with a "this severity was modified" annotation linking the
justification.

Payload:
```jsonc
{
  "new_severity": "Dangerous",        // must match SEVERITY_LABELS in SCHEMA.ts
  "original_severity": "Caution"      // copied from upstream at override-add time
                                       // (validator fails if upstream no longer matches)
}
```

#### `replace_note`

Replaces the upstream `combos[].note` prose for this combo. Original is preserved
in the override entry for audit. Use sparingly — usually `annotate` or upstream
contribution is preferable.

Payload:
```jsonc
{
  "new_note": "...",
  "original_note": "..."              // copied at override-add time
}
```

## Stale-hash gate

When `applies_to_upstream_hash` in this file differs from the current
`src/data/tripsit-pin.json` commit, `scripts/apply-overrides.ts` **fails the
build** with a list of every override that needs re-review. This is the
safeguard against pin updates silently invalidating override metadata
(PLAN.md Eng F2).

To re-pin: see `src/data/README.md` "Re-pinning to a newer upstream".

## Expiry warning

If `expires_or_review_by` is within 30 days, the validator emits a warning
(not an error) listing the overrides due for re-review. This forces the
project to either confirm or remove stale overrides instead of letting them
fossilize.

## Adding a new override

1. Identify a specific, citable concern with an upstream entry
2. Pick the minimum-impact mode (`annotate` < `replace_severity` < `replace_note`)
3. Get clinical review for severity reclassifications
4. Set `expires_or_review_by` to a date when this should be revisited
5. Run `bun run validate` + `bun test` before committing

## Tests

See `src/test/overrides.test.ts` and `src/test/overrides-stale-hash.test.ts`.
The latter explicitly exercises the pin-mismatch failure path.
