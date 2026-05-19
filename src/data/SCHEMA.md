# `mechanisms.json` — schema (v1.0.0)

This file is the project's **public API**. Bots, embeds, PDF generators, and any
future consumer of partysafe content reads this schema. Treat it accordingly:

- **Schema version is semver**. Breaking changes bump major; additive changes
  bump minor; clarifications bump patch. Build fails if `schema_version` in the
  file doesn't match the validator's expected version (see
  `scripts/validate-mechanisms.ts`).
- **Entry IDs are stable** once shipped. Renaming an entry requires `supersedes`
  + a deprecation window. Consumers can rely on IDs surviving major versions.
- **Every entry must have `en`** (English) locale content. Other locales are
  optional, per-entry. Build warns when a non-`en` locale is partially covered
  (i.e. exists on some entries but not all) so contributors don't leave a
  half-translated state.
- **`reviewed_by` is required for v1 ship**. Entries without clinician signoff
  do not render in v1 — the UI falls back to the upstream TripSit `combos[].note`
  for the relevant pair with a "this combo's mechanism is being reviewed" pill.

## File shape

```jsonc
{
  "schema_version": "1.0.0",
  "generated_at": "2026-05-19T08:30:00Z",       // ISO8601; informational
  "entries": [
    /* MechanismEntry */
  ]
}
```

## `MechanismEntry`

```jsonc
{
  "id": "stim-dissoc-caution",                  // kebab-case, stable, unique
  "category_pattern": "stimulant+dissociative", // ordered pair from CategoryPattern enum
  "severity": "Caution",                        // matches lib/severity.ts SEVERITY_ORDER
  "locales": {
    "en": { /* LocalizedContent */ }
    // "es": { /* LocalizedContent */ },        // optional
  },
  "sources": [ /* Citation[] */ ],              // ≥1 required
  "reviewed_by": [ /* ReviewerRef[] */ ],       // ≥1 required for v1 ship
  "reviewed_at": "2026-05-19",                  // ISO8601 date of latest review
  "supersedes": "old-entry-id"                  // optional; one-way deprecation
  // "disputed": { reason, source_url }         // optional; renders annotation pill
}
```

### `LocalizedContent`

```jsonc
{
  "mechanism_prose": "Stimulants mask the dissociative...",  // ≤80 words; Flesch ≥70
  "warning_signs": [                                          // ≤5 bullets
    "Hot skin / high body temp",
    "Confusion or disorientation",
    "Loss of motor control",
    "Difficulty breathing"
  ],
  "first_aid": [                                              // ≤4 numbered steps
    "Move to cool, quiet space",
    "Hydrate slowly with water",
    "Do NOT give more substances",
    "Stay with them; call 911 if unresponsive"
  ]
}
```

### `Citation`

```jsonc
{
  "source": "TripSit",                  // free text; lint expects known set
  "url": "https://...",
  "accessed_at": "2026-05-19"
}
```

### `ReviewerRef`

```jsonc
{
  "id": "dr-jane-smith",                          // stable handle
  "name": "Dr. Jane Smith, MD",                   // display name + degree
  "credentials": "Emergency Medicine, NYU Langone", // role + affiliation
  "reviewed_at": "2026-05-19",                    // ISO8601 date
  "asserts": "content accurate as of date",       // attestation language
  "url": "https://orcid.org/..."                  // optional
}
```

### `CategoryPattern`

Ordered pair of categories joined by `+`. The order is **lexicographic** on
the canonical category names (so `depressant+stimulant`, never `stimulant+depressant`).
The validator enforces this so lookups can be O(1).

Recognized categories (mirror TripSit's `categories` field):

```
barbiturate, benzodiazepine, deliriant, depressant, dissociative,
empathogen, habit-forming, inactive, nootropic, opioid, psychedelic,
research-chemical, ssri, stimulant, supplement
```

Plus the special meta-categories `common` and `tentative` are accepted but
ignored for pattern matching.

Example patterns:
- `depressant+depressant` (e.g. alcohol+benzo, alcohol+opioid)
- `serotonergic+serotonergic` — note: this requires a `serotonergic` category
  in our internal taxonomy (we add it via `category-pattern.ts` because TripSit
  classifies serotonergic substances under several existing categories)
- `mao+anything` — wildcard support for the MAOI special case (TBD in v1.1)

### `Severity`

Matches `lib/severity.ts`:

```
"Low Risk & Synergy" | "Low Risk & No Synergy" | "Low Risk & Decrease" |
"Caution" | "Unsafe" | "Dangerous"
```

Stored verbatim in entries — this is the same string TripSit's `combos[].status`
uses, so a future PR-upstream path doesn't need a transformation.

## Validation rules (enforced by `scripts/validate-mechanisms.ts`)

Build fails if any of the following are true:

1. `schema_version` ≠ "1.0.0"
2. Any entry has `id` that's not a unique kebab-case string `[a-z0-9-]+`
3. Any entry's `category_pattern` does not match `/^[a-z-]+\+[a-z-]+$/` OR the
   two categories are not in lexicographic order
4. Any entry's `severity` is not one of the six accepted strings
5. Any entry lacks `en` locale
6. Any locale has `mechanism_prose` > 80 words OR `warning_signs.length` > 5 OR
   `first_aid.length` > 4
7. Any entry has `sources.length` < 1
8. Any entry has `reviewed_by.length` < 1 (this is the v1 ship gate; can be
   downgraded to a warning during pre-clinical-review development by passing
   `--allow-unreviewed` to the validator)
9. Any `reviewed_at`, `accessed_at`, or `disputed.added_at` is not a valid ISO8601
   date or datetime
10. Any `supersedes` references an ID that doesn't exist in the file
11. Two entries share the same `(category_pattern, severity)` tuple — these
    must be unique (an entry is supposed to cover a single (pattern, severity)
    cell, so duplicates indicate either a merge conflict or a missing supersede)

## Adding a new entry

1. Run `bun run scripts/new-mechanism.ts` (lands in M3) for a scaffolded template
2. Fill in `mechanism_prose`, `warning_signs`, `first_aid` in `en` first
3. Add ≥1 citation in `sources`
4. Get clinical review; add a `ReviewerRef` to `reviewed_by`
5. Run `bun test src/test/schema-validation.test.ts` + `bun run scripts/lint-mechanisms.ts`
6. Commit

## Future consumers

This schema is the contract for any tool that consumes partysafe mechanism
content. If you're writing a Discord bot, an embeddable widget, a print
generator, or a TripSit upstream PR that imports our content: read this file
first. The shape is stable within `1.x`. Breaking changes will bump to `2.0.0`
with a documented migration path.
