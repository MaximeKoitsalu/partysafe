# partysafe — Implementation Plan

**Status:** Draft pending /autoplan review
**Author:** Maxime Koitsalu
**Date:** 2026-05-18
**Companion design doc:** `~/.gstack/projects/maximekoitsalu/maximekoitsalu-partysafe-init-design-20260518-164542.md`

---

## TL;DR

A static, mobile-first web app that lets a user select 2–4 substances and instantly see: (1) worst-case combination severity, (2) every pairwise risk with a plain-English mechanism explanation and first-aid guidance, and (3) an onset/peak/duration timeline. Built on the TripSit drugs dataset (CC BY-NC-SA), shipped as a single static bundle deployable to any static host. No accounts, no analytics, no tracking. Emergency resources visible on every screen.

The product purpose is harm reduction: people who plan to use substances will use them; informed users have measurably better outcomes (DanceSafe, Drug Policy Alliance, Portuguese / Dutch / Swiss public-health data).

The differentiator vs. the existing TripSit chart and `combo.tripsit.me` is: multi-substance selection (not just pairwise), plain-English mechanism (not just severity color), and onset/duration timeline (no existing tool surfaces this).

---

## Scope

### In scope (v1 ship)

- Substance multi-select picker (typeahead, 2–4 substances, street-name synonyms)
- Pairwise combo risk grid with severity chips
- Worst-case banner (single dominant severity above the fold)
- Plain-English mechanism explanation for each pair (~30-50 hand-written entries)
- "What to watch for" + first-aid micro-content per mechanism
- Onset / peak / duration timeline strip per substance
- Per-substance detail page (full factsheet from TripSit data)
- Always-visible emergency footer (911, Never Use Alone hotline)
- Dedicated `/emergency` view (full screen, large buttons, recovery position, OD signs)
- First-visit disclaimer banner (dismissible)
- Hash-based shareable URLs (`#/combo/mdma,ketamine`)
- About / attribution / license page
- TripSit attribution prominent on every screen
- Mobile-first responsive design, desktop bonus
- Lighthouse mobile: Performance 90+, Accessibility 100, Best Practices 100, SEO 100
- Deploy to GitHub Pages via Actions workflow

### Out of scope (v1; deferred to future versions)

- Dose calculator (legal/ethical risk too high without expert review)
- Test-kit purchasing or links to purchase
- Drug-checking service integration (e.g. EZ Test, DanceSafe testing)
- User accounts, profiles, history
- Server-side anything
- PWA / offline mode (deferred to v2; v1 will accidentally cache static assets but no service worker)
- Internationalization (English-only v1; ES/FR/PT/DE in v2)
- Substance images / chemical structure diagrams
- Cross-substance interaction with prescription meds (massive scope, requires pharmacist)
- Recreational dose-titration guidance
- Trip-report or experience-narrative content
- Forum / chat / community features

---

## Architecture

Single-page application built with **Vite + TypeScript + Tailwind v4**. No runtime framework (no React/Vue/Svelte). All UI is DOM-native components composed as ES modules.

### File layout

```
~/partysafe/
├── src/
│   ├── main.ts                   # Entry: router init, initial render
│   ├── router.ts                 # Hash router: #/, #/combo/..., #/drug/..., #/emergency, #/about
│   ├── types.ts                  # Substance, Combo, Severity, Mechanism types
│   ├── data/
│   │   ├── tripsit.json          # Bundled TripSit drugs dataset (pinned commit)
│   │   ├── mechanisms.json       # Hand-written plain-English mechanism entries
│   │   ├── load.ts               # Typed loaders + indexed lookups
│   │   └── README.md             # Dataset provenance, pin hash, refresh procedure
│   ├── lib/
│   │   ├── combo.ts              # combo(substances[]) → pairwise + worst-case
│   │   ├── synonyms.ts           # street-name → canonical
│   │   ├── severity.ts           # severity ranking + color/icon tokens
│   │   └── timeline.ts           # onset/peak/duration parsing + bar generation
│   ├── components/
│   │   ├── SubstancePicker.ts    # Typeahead multi-select 2-4
│   │   ├── ComboBanner.ts        # Worst-case severity above the fold
│   │   ├── ComboGrid.ts          # Pairwise tiles
│   │   ├── MechanismExplainer.ts # Per-pair expansion w/ first-aid
│   │   ├── TimelineStrip.ts      # Onset/peak/duration visualization
│   │   ├── DrugDetail.ts         # Full factsheet
│   │   ├── EmergencyFooter.ts    # Always-visible 911/NUA strip
│   │   ├── EmergencyView.ts      # Full-screen /emergency
│   │   ├── DisclaimerBanner.ts   # First-visit, localStorage dismiss
│   │   ├── SeverityChip.ts       # Shared severity pill (color+icon+label)
│   │   └── AboutView.ts          # License, attribution, disclaimer
│   ├── styles/
│   │   └── tailwind.css          # Tailwind v4 entry, design tokens
│   └── test/
│       ├── combo.test.ts         # Combo lookup correctness
│       ├── synonyms.test.ts      # Street-name resolution
│       ├── severity.test.ts      # Ranking + worst-case
│       └── timeline.test.ts      # Duration parsing
├── public/
│   ├── favicon.svg
│   ├── og-image.png              # OG card for hash links
│   └── robots.txt
├── index.html                    # Vite entry
├── vite.config.ts
├── tailwind.config.ts            # Minimal v4 config
├── package.json                  # bun-managed
├── tsconfig.json
├── README.md                     # What/why/how-to-build/license/attribution
├── LICENSE                       # CC BY-NC-SA 4.0
├── ATTRIBUTION.md                # TripSit credit + dataset pin hash
├── DISCLAIMER.md                 # Legal/medical disclaimer text
├── CHANGELOG.md
├── PLAN.md                       # This file
└── .github/
    └── workflows/
        └── deploy.yml            # GH Pages deploy on push to main
```

### Routing

| Hash | View |
|---|---|
| `#/` | Combo planner (default landing) |
| `#/combo/mdma,ketamine` | Combo planner with substances preselected (shareable) |
| `#/drug/mdma` | Full per-substance factsheet |
| `#/emergency` | Full-screen emergency panel |
| `#/about` | License, attribution, disclaimer, contact |

Hash routing: works on every static host without server config; copyable URLs; no server logs of paths.

### Data pipeline

1. **Source:** TripSit's open dataset at https://github.com/TripSit/drugs (file: `drugs.json`).
2. **Pin:** Specific upstream commit hash recorded in `ATTRIBUTION.md`. Update procedure documented in `src/data/README.md`.
3. **Bundle:** `tripsit.json` checked into repo at `src/data/`. Imported at build time by Vite, included in JS bundle.
4. **Hand-written:** `mechanisms.json` produced by author. ~30-50 entries keyed by `(substance-category-pair, severity)` (e.g. "stimulant+dissociative+Caution"). Each entry: 1-paragraph mechanism, warning-signs list, first-aid list, severity label.
5. **Build-time indexing:** Vite plugin builds `Map<canonical-pair, mechanism-id>` lookup for O(1) combo resolution at runtime.

### Severity model

Six levels matching TripSit:
- 🟢 **Low Risk & Synergy** — combination is generally safe and may enhance experience
- 🔵 **Low Risk & No Synergy** — combination is generally safe with no notable interaction
- 🔽 **Low Risk & Decrease** — one substance dampens the other; not dangerous but may reduce effect
- 🟧 **Caution** — combination has potential risks; informed care required
- 🟥 **Unsafe** — combination carries significant risk of harm
- 🟫 **Dangerous** — combination has serious risk of overdose, organ damage, or death

Every chip pairs color + icon + text label (color-alone is insufficient for accessibility).

### Hand-written mechanism content

This is the new content the project produces. Estimated 30-50 entries.

Each entry covers a *category pattern* (not every substance pair individually). Examples:
- `depressant + depressant`: respiratory depression mechanism, signs, recovery position, when to call 911
- `serotonergic + serotonergic`: serotonin syndrome mechanism, signs (hyperthermia, agitation, clonus), no further dosing, call 911 if severe
- `stimulant + stimulant`: cardiovascular load, hyperthermia, dehydration, signs to watch
- `stimulant + dissociative`: masking of dissociative dose-response, redose risk, hyperthermia
- `MAOI + serotonergic`: MAOI-specific hypertensive crisis + serotonin syndrome
- `alcohol + opioid`: respiratory depression specific
- `alcohol + benzodiazepine`: respiratory depression + memory blackout
- `cocaine + alcohol`: cocaethylene formation, cardiac risk
- `psychedelic + lithium`: seizure risk
- etc.

Categories assigned per substance from TripSit's `categories` field. Many specific pairs collapse onto the same category pattern, which is why ~30-50 entries cover the full grid.

**Source material for authoring:** TripSit's existing `combos[].note` field (paraphrase for plain-English on mobile), DanceSafe combo cards, Erowid, PsychonautWiki sidebar. Original authorship; not copy-paste. Citations in `ATTRIBUTION.md`.

---

## Implementation Milestones

Sequential — each milestone is independently shippable and verifiable.

### M0 — Project setup (~30 min CC time)

- `bun init`, install vite + typescript + tailwindcss v4
- Vite config, tsconfig, tailwind config
- Smoke-test build: `bun run build` produces `dist/index.html`
- Commit baseline

### M1 — Data layer (~1 hr CC)

- Fetch and commit `src/data/tripsit.json` from upstream (pin hash)
- Write `types.ts`: `Substance`, `Combo`, `Severity`, `Mechanism`, `Timeline`
- Write `data/load.ts`: typed loaders + canonical-name index + alias index
- Write `lib/synonyms.ts`: alias → canonical resolver
- Write `lib/combo.ts`: `comboFor(substances: string[]): PairwiseResult[]` + `worstCase()`
- Write `lib/severity.ts`: ranking, color tokens, icon mappings
- Write `lib/timeline.ts`: parse duration strings ("30-60 min", "3-5 hours"), produce bar segments
- Tests for combo, synonyms, severity, timeline (Bun test runner; ~20 tests targeting edge cases)
- All pure logic; no UI yet

### M2 — Core UI: substance picker + combo grid (~2 hr CC)

- `SubstancePicker` component: typeahead input, chip display, 2-4 cap, alias-aware
- `SeverityChip` shared component
- `ComboBanner` worst-case banner
- `ComboGrid` pairwise tiles (no mechanism expansion yet — that's M3)
- Hook to URL hash: read substances from `#/combo/a,b,c`, update on selection
- `router.ts` minimal hash routing
- `main.ts` mount + initial render
- Tailwind tokens: severity colors, mobile-first layout
- Manual smoke test: pick 2 substances, see worst-case + pairwise tiles

### M3 — Mechanism content + explainer (~3-4 hr CC + ~1 afternoon authoring)

- Draft `mechanisms.json` schema and write ~30-50 entries
- Match entries to substance-category-pairs at build time
- `MechanismExplainer` component: per-pair expandable card with mechanism, warning signs, first-aid
- Wire into `ComboGrid` tiles (tap to expand)
- Tests for mechanism lookup (covers all severity × category-pair patterns)

### M4 — Timeline + drug detail (~2 hr CC)

- `TimelineStrip` component: horizontal bars per substance, onset/peak/duration phases
- `DrugDetail` view: full factsheet for `#/drug/mdma` — dose ranges, duration, harm-reduction tips, aliases, references
- Cross-link from combo view → drug detail
- Wire `/drug/[slug]` route

### M5 — Emergency + disclaimer + about (~1.5 hr CC)

- `EmergencyFooter`: always-visible bottom strip, expands to full panel
- `EmergencyView`: dedicated `#/emergency` route, large buttons, OD signs, recovery position, hotlines
- `DisclaimerBanner`: first-visit, localStorage dismiss
- `AboutView`: license, attribution, dataset pin, contact
- Wire all routes

### M6 — Polish + accessibility + Lighthouse (~2-3 hr CC)

- WCAG AA audit (contrast ratios, ARIA labels, keyboard nav, focus management)
- Color-blind verification (color + icon + text everywhere)
- Lighthouse mobile audit → iterate to 90+ Perf, 100 A11y/BP/SEO
- OG image, favicon, robots.txt
- README final pass

### M7 — Deploy (~30 min CC)

- `.github/workflows/deploy.yml` for GH Pages
- Push to GitHub, enable Pages, verify live
- Cross-device smoke test (iOS Safari, Android Chrome, desktop)
- Smoke test from `file://` (verify offline-from-disk works)

**Estimated total CC time:** ~12-15 hours of focused implementation + ~1 afternoon of mechanism content authoring. Human-team equivalent: ~3-4 weeks.

---

## Data sources + license

- **Combo + factsheet data:** TripSit `drugs.json` (https://github.com/TripSit/drugs), CC BY-NC-SA 4.0. Pinned commit in `ATTRIBUTION.md`.
- **Mechanism content:** Original authorship, derived/paraphrased from TripSit, DanceSafe, Erowid, PsychonautWiki. Citations in `ATTRIBUTION.md`. Released under CC BY-NC-SA 4.0 (share-alike requirement).
- **Project license:** CC BY-NC-SA 4.0 (matches data; required by share-alike).

License implications:
- **Cannot:** charge for the app, monetize via ads, white-label for commercial use.
- **Must:** credit TripSit + cited sources prominently, share modifications under same license, no DRM.
- **Can:** accept donations, run on a non-commercial server, mirror, fork, modify.

---

## Testing strategy

- **Unit tests (Bun):** `combo.ts`, `synonyms.ts`, `severity.ts`, `timeline.ts`, `mechanism lookup`. Target: ~50 tests, run in <1s.
- **No E2E v1.** Manual smoke test scripts in `README.md` covering: pick 2 stimulants, pick 4 mixed substances, drug detail, emergency view, disclaimer dismiss, hash-link share, color-blind simulation, keyboard-only navigation, screen-reader spot check.
- **Lighthouse CI:** GitHub Action runs Lighthouse on every push; fails build if mobile Performance <85 or Accessibility <100.
- **Manual cross-browser:** iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari pre-deploy.

---

## Deployment

- **Primary:** GitHub Pages at `https://maximekoitsalu.github.io/partysafe/`
- **Trigger:** push to `main`
- **Workflow:** `.github/workflows/deploy.yml` — checkout, bun install, bun run build, upload `dist/`, deploy
- **Custom domain:** consider `partysafe.org` or similar later; verify domain availability and CC BY-NC-SA compatibility (non-commercial registration only).

Site is portable: `dist/` can be uploaded to Vercel, Cloudflare Pages, Netlify, S3, or served from `file://`. Mirroring is encouraged in the README.

---

## Open questions for /autoplan reviewers

The following are flagged as "non-blocking but reviewer should weigh in":

1. **Mechanism content authoring effort.** Is ~30-50 entries the right granularity, or do we need per-substance-pair entries (~500+) for accuracy? Tradeoff: category-pattern entries are maintainable; per-pair entries are more accurate but a 10x content load.

2. **Synonym dictionary scope.** English-only v1, or include common Spanish/Portuguese/French/German street names for the European festival circuit? (i18n proper deferred to v2 regardless.)

3. **Disclaimer treatment.** First-visit modal (legally clean, annoying), top banner (friendly, less legally airtight), or interstitial first-tap-on-combo (compromise)?

4. **Severity-first sorting when 3+ substances.** When user picks 3-4 substances, sort pairwise tiles by severity descending? Recommend yes — saves lives — but flagging for review.

5. **Mechanism + emergency content placement.** Redundancy between per-mechanism first-aid steps and dedicated `/emergency` view. Recommend keeping both. Confirm.

6. **Dataset refresh cadence.** Quarterly or on-demand? How do we handle upstream schema changes?

7. **Reporting upstream corrections.** When a user (or maintainer) spots a TripSit data error, what's the loop? Document a "report a data issue" link → TripSit GitHub Issues.

8. **Analytics-free verification.** How do we know it's being used / useful without analytics? Recommend: optional anonymous "this combo info was helpful" thumbs-up that never leaves the device (localStorage counter only); GitHub stars; manual community signal.

9. **Liability framing in disclaimer.** Should we cite specific legal jurisdictions, or write a generic "informational, not medical advice" disclaimer? Recommend generic. Need a lawyer eyeball before public launch but not blocking v1 ship.

10. **OG image content.** Showing combo severity in OG card might be misread by social platforms as "promoting drug use." Recommend neutral product OG card (logo + tagline + emergency hotline number).

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Mechanism content is wrong or unsafe | Medium | High (real harm) | Multi-source authoring (TripSit + DanceSafe + Erowid + PsychonautWiki); pre-launch review by harm-reduction practitioner if reachable; explicit "this is general information, not medical advice; for medical emergencies call 911"; clearly link upstream sources for verification |
| TripSit upstream schema change breaks build | Low | Medium | Pinned commit hash; manual upgrade procedure; types.ts gates incompatible data at build time |
| Liability if site is misused | Low-Medium | High (legal) | Prominent disclaimer; emergency resources on every page; no dose calculator; no purchase links; no encouragement of use; harm-reduction framing only |
| Color-blind accessibility failure | Low | Medium | Color + icon + text on every severity chip; WCAG AA contrast audit; tested in Lighthouse + color-blind simulators |
| Site listed/de-indexed for "drug content" | Medium | Low | robots.txt allows; OG metadata neutral; if de-indexed, mirror story keeps it accessible; harm-reduction framing is legitimate public health |
| Performance regression on low-end Android | Medium | Medium | Mobile-first build; no framework runtime; small bundle; Lighthouse CI gate at 85+ |
| Privacy leak via URL share | Low | Medium | Hash routing (URLs don't hit a server); URL contains only substance slugs, never PII; document privacy posture in About |
| TripSit license-compliance gap | Low | High (legal/ethical) | Audit attribution placement; LICENSE matches; explicit non-commercial commitment; rejected funding routes documented |
| Hosting takedown (GH Pages) | Low | Medium | Encourage mirroring; deploy-anywhere static output; document mirror procedure in README |

---

## Success criteria

A v1 ship is successful if all of these are true:

- [ ] User picks 2-4 substances on phone in under 15 seconds
- [ ] Worst-case severity visible above the fold without scrolling
- [ ] Each pairwise risk has plain-English mechanism + warning signs + first-aid
- [ ] Timeline strip shows onset/peak/duration for selected substances
- [ ] Emergency resources reachable from every screen in ≤1 tap
- [ ] Shareable hash URL reproduces the same view when sent to a friend
- [ ] Lighthouse mobile: Performance 90+, Accessibility 100, Best Practices 100, SEO 100
- [ ] Site loads in <2s on mid-tier mobile (3G simulation)
- [ ] Site works from `file://` (offline-from-disk)
- [ ] TripSit attribution visible on every page
- [ ] LICENSE matches CC BY-NC-SA 4.0
- [ ] ATTRIBUTION.md pins dataset commit hash
- [ ] All unit tests pass
- [ ] Manual smoke tests pass on iOS Safari + Android Chrome + desktop

---

## What ships, when

This document is the v1 plan. After /autoplan review and approval, M0-M7 execute in sequence. Estimated wall-clock with CC: 2-3 working sessions. Estimated wall-clock human-team: 3-4 weeks. The completeness gap is precisely the mechanism content authoring — that's where deliberate human judgment is required and where AI can draft but not finalize.
