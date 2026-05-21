# partysafe

A static, mobile-first harm-reduction reference for how recreational substances
interact. Pick 2–4 substances and see the known pairwise risks in plain language,
with what to watch for, what to do if something goes wrong, and an onset/duration
timeline. **It is information, not medical advice.**

- **No accounts. No analytics. No cookies. No server.** Everything runs in your
  browser. Nothing you select is ever sent anywhere.
- Built on the [TripSit](https://github.com/TripSit/drugs) dataset (CC BY-NC-SA 4.0)
  with original plain-English mechanism content.
- Region-aware emergency info that does **not** assume you're American (112 is the
  universal default; your country is detected and adjustable).

> ⚠️ **Mechanism content is draft pending clinical review.** No `reviewed_by`
> sign-off has been recorded yet. See "Ship gates" below — this is not ready for
> public launch.

## Quick start

Requires Bun ≥ 1.3.0.

```bash
bun install
bun run dev        # http://localhost:5173/partysafe/
```

## Build & test

```bash
bun run build      # validate mechanisms → lint → typecheck → vite build → dist/
bun test           # ~214 unit/integration tests, < 1s
bun run lint       # ESLint (enforces the no-innerHTML XSS ban, Eng E13)
bun run typecheck  # tsc --noEmit
```

`bun run build` is the gate: it runs `validate` (mechanism schema + overrides
stale-hash + content lint), `lint` (XSS ban + code quality), `typecheck`, then
the Vite production build. All four must pass.

### Strict validation (ship gate)

```bash
bun run validate:strict   # FAILS if any mechanism entry lacks clinician sign-off
```

`build` uses `validate` (which warns on unreviewed entries so development isn't
blocked). `validate:strict` is the pre-launch gate — it refuses to pass while
`reviewed_by` is empty on any entry.

## Architecture

Single-page app, Vite + TypeScript + Tailwind v4, **no runtime framework** —
hand-rolled DOM components via `src/lib/dom.ts` (textContent-only; innerHTML is
ESLint-banned). Hash routing so it works on any static host with no server config.

```
src/
├── main.ts            # entry: router + state + component wiring + lazy data load
├── router.ts          # 12-rule hash router (lowercase/dedupe/cap-4/XSS-reject/…)
├── types.ts           # Substance, Combo, Severity, branded SubstanceSlug
├── data/
│   ├── tripsit.lean.json   # bundled TripSit dataset (pinned; see ATTRIBUTION.md)
│   ├── mechanisms.json     # partysafe-authored mechanism content (the asset)
│   ├── overrides.json      # corrections layer over disputed upstream entries
│   ├── SCHEMA.ts/.md       # mechanism schema + runtime validator
│   └── load.ts             # fetch (not inline) → keeps JS bundle small
├── lib/
│   ├── combo.ts            # pairwiseRisksFor() — the core analysis
│   ├── category-pattern.ts # category → ordered pattern matching
│   ├── severity.ts         # ranking + color/icon/pattern tokens
│   ├── synonyms.ts         # alias → canonical (branded slug validation)
│   ├── timeline.ts         # onset/peak/duration parsing
│   ├── emergency.ts        # region-aware hotlines (112 universal default)
│   ├── storage.ts          # versioned, corruption-safe localStorage
│   └── dom.ts              # el()/svg()/replace() + focus trap
└── components/        # SubstancePicker, ComboBanner, ComboGrid, MechanismSheet,
                       # TimelineStrip, DrugDetail, EmergencyView, DisclaimerBanner,
                       # AboutView, EmergencyActionBar, SeverityChip, …
```

### Data pipeline

```bash
bun run data:refresh   # re-fetch pinned TripSit commit → regenerate lean dataset
```

The raw ~1.6 MB TripSit dataset is **not** committed; only the lean ~411 KB output
(stripped to the fields we render). The pin commit is in `ATTRIBUTION.md`. Combo
severity always comes from TripSit; partysafe mechanism entries are keyed by
`(category_pattern, severity)` and only attach when both match the real data, so a
low-risk combo never gets a scary mechanism force-fitted onto it. Coverage of risky
pairs is regression-tested (`src/test/combo-coverage.test.ts`, ≥ 80% floor).

## Design decisions worth knowing

- **No green "safe" label.** Lower-risk combos render in neutral slate-blue
  ("Reported Synergy"), never a green checkmark — a green badge is too easily
  screenshotted out of context as an endorsement.
- **Cumulative risk for 3+ substances is not modeled.** The UI says so explicitly
  (black warning bar) and collapses the pairwise estimates behind a reveal.
- **Emergency is region-aware.** 112 is the universal default (works on most mobile
  phones worldwide). The detected region is adjustable and persists.
- **Severity is conveyed by color + icon + text + (for Dangerous) a stripe pattern**
  — so it survives color-blindness and B&W printing.

## Accessibility

- WCAG AA contrast verified by test (`src/test/contrast.test.ts`) for every
  severity color in both themes.
- Skip-to-content link, focus-visible rings, focus trap in modal + sheet,
  44px minimum touch targets, dark mode default with `prefers-color-scheme` +
  manual toggle.
- **Motion** ("neon dusk" vaporwave skin): anime.js entrance reveals + CSS
  ambient effects (grid drift, sun glow, brand pulse), all gated behind
  `prefers-reduced-motion: reduce` — when set, content appears statically and
  nothing is left mid-animation (`src/lib/anim.ts` no-ops; verified by test).
  The only runtime dependency is anime.js (~14 KB gz, bundled from `'self'`,
  CSP-safe); there is still no UI framework.

## Manual smoke test matrix (pre-deploy)

Run on at least iOS Safari, Android Chrome, and desktop:

1. Pick 2 substances → worst-case banner + pairwise tile + mechanism sheet
2. Pick 3+ → black cumulative warning, pairwise collapsed behind reveal
3. Tap a combo tile → bottom sheet (mechanism, watch-for, first-aid, sources)
4. Open a drug factsheet from a "Read more" row
5. Emergency bar → `/emergency` → change region → CALL number updates
6. First picker interaction → disclaimer modal; dismiss; reload (stays dismissed)
7. Share a `#/combo/mdma,ketamine` link → opens with substances preselected
8. Offline after first load (service worker lands in M7)
9. Keyboard-only nav through picker, sheet, emergency
10. Color-blind simulator: Caution / Unsafe / Dangerous remain distinguishable
11. Print a combo (print preview) — wallet-card layout
12. Light + dark mode both legible

## Privacy

No accounts, no analytics, no cookies, no server inputs. Combo selections happen
client-side; shareable URLs contain substance names only. `referrer: no-referrer`
prevents Referer-header leaks to external links. localStorage stores only: the
disclaimer acknowledgement (90-day expiry), your region choice, and your last 3
combos for convenience — all clearable from `/about`.

## Deployment

```bash
bun run build      # → dist/
```

`dist/` is a portable static bundle — deploy to GitHub Pages, Cloudflare Pages,
Netlify, S3, or serve from `file://`. The base path defaults to `/partysafe/`;
override with `VITE_BASE=/ bun run build` for a root deploy.

`public/_headers` ships a strict CSP + security headers for hosts that honor
response headers (Cloudflare Pages, Netlify). GitHub Pages ignores it; the `<meta>`
CSP in `index.html` is the fallback there.

GitHub Pages workflow + Codeberg/Internet Archive mirrors + service worker land in
M7 (see [PLAN.md](PLAN.md)).

## Ship gates (must clear before public launch)

These are deliberate blockers, not TODOs:

1. **Clinical review** — every mechanism entry needs `reviewed_by` sign-off from a
   qualified harm-reduction clinician. `validate:strict` enforces this.
2. **Legal review** — a lawyer should review the disclaimer + first-aid content for
   the launch jurisdiction(s) before going public.
3. **Distribution** — line up at least one of: a TripSit upstream contribution, a
   harm-reduction org cross-link, or a launch artifact, so the content is actually
   found by the people it's for.

## Reporting issues

- Data classification disputes → upstream at https://github.com/TripSit/drugs/issues
- Mechanism content corrections, UI / accessibility / build problems → open an issue here

## License & attribution

partysafe is open source under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/),
matching the TripSit data license. Share and adapt for non-commercial use with
attribution, under the same license. See [ATTRIBUTION.md](ATTRIBUTION.md) for full
credits (TripSit, DanceSafe, PsychonautWiki, Erowid, CDC, NHS, NIDA, MAPS) and
[DISCLAIMER.md](DISCLAIMER.md).

**In an emergency, call your local emergency number** (112 across most of the
world, 911 in North America, 999 in the UK, 000 in Australia).

## What this is for

People who go out, party, or experiment with substances do so regardless of
information availability. The harm-reduction premise — established by DanceSafe,
the Drug Policy Alliance, the Portuguese / Dutch / Swiss public-health services,
and decades of community-built tools like TripSit and Erowid — is that informed
users have measurably better outcomes than uninformed ones. This project exists to
make that information more accessible at the moment of decision: on a phone, in a
venue, before something irreversible happens.
