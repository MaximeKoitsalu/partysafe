<!-- /autoplan restore point: /Users/maximekoitsalu/.gstack/projects/maximekoitsalu-partysafe/main-autoplan-restore-20260518-165641.md -->
# partysafe — Implementation Plan

**Status:** ✅ APPROVED via /autoplan on 2026-05-18 (77 auto-decided, 8 gate decisions resolved with defaults)

## Final approved decisions (gate close-out)

**User challenges resolved (all 3 → defaults):**
- **U1 Stay with current milestone order.** `mechanisms.json` is treated as a public API with full schema; content-first benefit captured architecturally without reordering ships.
- **U2 Lawyer + clinician review are v1 ship gates.** No mechanism entry ships without named clinician signoff; no public launch without ≥1hr lawyer consult on disclaimer + Section 230 + corporate shield.
- **U3 Distribution outreach is a ship gate (low bar).** Acceptable: at least one of (a) TripSit PR submitted, (b) HR-org link commitment, OR (c) launch artifact (HN/Reddit post in r/Drugs, r/RollSafe, r/Bluelight + Twitter walkthrough).

**Taste decisions resolved (all 5 → recommended defaults):**
- **T1 Honest 80hr CC budget** (not 55hr-with-cuts). All safety + festival-context features in v1.
- **T2 Full first-aid steps in v1 with clinician review** (option A). Coupled with U2 ship gate.
- **T3 Planner-context as primary user**, festival-midnight as secondary. Distribution + content depth + SEO tuned for planner. Sticky emergency action bar stays (costs nothing, serves both).
- **T4 Zero telemetry in v1.** Revisit after first 1000 sessions if signal needed.
- **T5 Build standalone v1 AND submit TripSit upstream PR in parallel.** PR submission waits until 10 clinician-reviewed entries; until then parallel intent, not parallel work.

## Approved revised milestone budget

| Milestone | CC budget | Adds |
|---|---|---|
| M0 — setup + design tokens + Tailwind v4 + dark mode default | 3hr | Token spec ships before M2 |
| M1 — data layer + SCHEMA.md/.ts + validate-mechanisms.ts + apply-overrides.ts + tests | 6hr | Public API treatment |
| M2 — SubstancePicker (WAI-ARIA combobox) + ComboGrid + SeverityChip + router (12 cases) + tests | 5hr | XSS defense via branded slugs |
| M3 — mechanism content authoring (phased: v0.1=10 entries, v1=20 entries, v1.x=backfill) + clinician review loop | 33hr | Lint enforced |
| M4 — TimelineStrip + DrugDetail + DRY refactors (lib/match, lib/emergency, lib/category-pattern) | 3hr | |
| M5 — EmergencyActionBar (sticky) + EmergencyView + region tel chain + recovery position SVG + print wallet card | 9hr | Cross-browser print matrix |
| M6 — a11y + Lighthouse 85+ + axe-core + cross-browser + bundlesize gate | 5hr | Lighthouse mobile target = 85 not 90 (honest SW penalty) |
| M7 — deploy.yml + mirror.yml + archive.yml + drift.yml + reproducibility.yml | 4hr | All 5 workflows shipped together |
| Service worker (CEO #7 / Eng F4) | 6hr | Locked strategy per route |
| Overrides system (CEO #2 / Eng F2) | 4hr | Stale-hash gate |
| i18n plumbing (CEO #8 / Eng F3) | 2hr | en hardcoded, schema ready |
| Test backlog (108 tests across 23 files) | 8hr | See test plan artifact |
| Privacy/CSP/security audit + fixes (Eng F9-F11) | 3hr | Referrer-Policy, CSP, ESLint XSS |
| Supply-chain hardening (Eng F10) | 1hr | frozen-lockfile, audit, ignore-scripts |
| Reproducible-build verification (Eng F12) | 1hr | CI workflow |
| Pre-launch lawyer consult + clinician review coordination | calendar time | NOT in CC budget; SHIP GATE |
| Pre-launch distribution outreach (TripSit PR + HR-org outreach OR launch artifact draft) | calendar time | NOT in CC budget; SHIP GATE |
| **Total CC budget** | **~93hr** | |

**Calendar estimate:** 4-6 weeks from M0 kickoff to public launch, including review/outreach gates.
**Human-team equivalent:** 12-16 weeks.

## Ship gates (locked at gate close-out)

Before public launch, ALL of these must be true:
- [ ] All 108 unit/integration/snapshot tests pass
- [ ] Schema validator passes; mechanism content lint passes
- [ ] Lighthouse mobile: Performance ≥85, Accessibility 100, Best Practices 100, SEO 100
- [ ] axe-core: zero violations
- [ ] Bundle size: JS gzipped ≤100KB, CSS ≤25KB
- [ ] Reproducibility: two builds produce identical `dist/`
- [ ] `bun pm audit`: zero high/critical
- [ ] Codeberg mirror is current (drift.yml passes)
- [ ] Internet Archive snapshot of latest release captured
- [ ] Cross-browser manual smoke test passed (12-item checklist from test plan)
- [ ] **Clinician signoff** on every mechanism entry shipping in this version (`reviewed_by` populated)
- [ ] **Lawyer consult** (≥1hr) completed; disclaimer language and corporate shield decisions documented
- [ ] **Distribution outreach** evidence (at least one of: TripSit PR submitted, HR-org link commitment in writing, OR drafted launch artifact ready to post)

---

**Status:** ✅ APPROVED via /autoplan on 2026-05-18 (77 auto-decided, 8 gate decisions resolved with defaults)
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

---

# /autoplan — CEO REVIEW

**Mode:** SELECTIVE EXPANSION (hold core scope; cherry-pick expansions in blast radius)
**Voices:** Claude main + Claude independent subagent. **Codex: unavailable** on this machine → `[subagent-only]` mode.

## CEO Step 0A — Premise Challenge

The subagent's pushback on premises was sharp and partially correct. Revisions auto-decided where mechanical; surfaced at gate where taste/user-challenge.

| # | Original premise | Revision | Decision |
|---|---|---|---|
| 1 | "Info reduces harm" cited via DanceSafe / DPA / EU policy data | Tightened: "Informed users make different decisions; harm-reduction information tools have plausible but not exhaustively-proven population-level safety impact. We ship anyway because individual access to combo information is a legitimate end in itself." | **Auto-decided** (P5 explicit) |
| 4 | "Trust TripSit data as-is; report upstream" | Add `overrides.json` layer for entries with documented disputes (MDMA+MAOI severity, cannabis interactions, kratom). UI shows "this entry has been reviewed/disputed because Y" annotation when override applies. | **Auto-decided** (P1 completeness, P2 in safety blast radius) |
| 7 | "Multi-substance is the differentiator" | Reframed: "Plain-English mechanism content + i18n-ready data corpus is the differentiator. Multi-substance UI is a discoverability/usability improvement over combo.tripsit.me, not a pharmacological one. **Cumulative-risk for 3+ substances is explicitly not modeled — warn prominently when user picks 3+."** | **Auto-decided** (P5 explicit; honesty about modeling limits) |
| 9 + 5 | "Deploy-anywhere" + "CC BY-NC-SA" tension | Dual-license: TripSit-derived data stays CC BY-NC-SA (forced by upstream). Original mechanism content + UI code dual-licensed CC BY-SA + MIT respectively so HR orgs can redistribute freely. | **Auto-decided** (P1 completeness; preserves redistribution path) |
| 3 | "Privacy is the moat" | "Privacy is a category constraint, not a moat." Phrasing change only. | **Auto-decided** (P5 explicit) |

Premises 2, 6, 8, 10 hold unchanged.

## CEO Step 0B — Existing code leverage map

| Sub-problem | What already exists | How we leverage |
|---|---|---|
| Combo + factsheet data | TripSit `drugs.json` (CC BY-NC-SA) | Pin specific upstream commit; bundle at build time |
| Severity classification rubric | TripSit's 6-tier system | Adopt directly |
| Mechanism prose source | TripSit `combos[].note`, DanceSafe cards, Erowid, PsychonautWiki sidebar | Paraphrase + cite; do not copy-paste; clinician review gate (see Step 0E) |
| Hash routing pattern | Browser History API + standard `hashchange` event | Standard, no dependency |
| Typeahead picker | Native HTML `<datalist>` or ~50-line hand-rolled custom component | Hand-rolled for accessibility + multi-select; reference patterns from headless-ui |
| Static deploy pipeline | GitHub Pages + Actions workflow | Standard, copy from any public Vite-on-Pages project |
| Print/PDF wallet card | CSS `@media print` + standard print stylesheets | No JS library needed |
| Service worker | Workbox `precaching` strategy or hand-rolled ~50 lines | Hand-rolled for clarity; small bundle |

## CEO Step 0C — Dream state delta

```
CURRENT (today)                      THIS PLAN (v1 ship)                 12-MONTH IDEAL
─────────────────                    ───────────────────                  ──────────────
TripSit PNG chart (static,            Multi-substance combo planner       Cross-platform: web + bot
  pairwise, no mechanism)             + plain-English mechanism corpus    + embeddable widget +
combo.tripsit.me                      + onset/duration timeline           print wallet cards.
  (pairwise text, dated UI)           + emergency footer                  Localized (en/es/fr/pt/de).
DanceSafe paper cards                 + dedicated /emergency view         Mechanism content reviewed
  (trusted, limited reach)            + first-visit disclaimer            by named clinicians + harm
PsychonautWiki sidebar                + shareable hash URLs               reduction practitioners.
  (encyclopedia, not planner)         + service worker (offline)          Cross-linked from TripSit,
                                      + i18n-ready data model             DanceSafe, PsychonautWiki,
                                      + overrides.json for known          KnowDrugs as a referenced
                                        data disputes                     resource. Print PDFs
                                      + Tor/Codeberg mirror posture       distributed at festivals
                                                                          by HR orgs.
```

**12-month delta:** v1 is the *content asset + primary renderer*. v2 (bot/embed/PDF generator at scale/i18n translation) consumes the same `mechanisms.json` as a public API. Form factor expands without rewriting content.

## CEO Step 0C-bis — Implementation alternatives (revisited post-subagent)

| Approach | Effort (CC / human) | Risk | Pros | Cons |
|---|---|---|---|---|
| **A. Plan-as-is (static site, content-first JSON API)** | 15-20hr CC / 3-4wk team | Distribution risk; mechanism quality risk | Owned distribution; full UX control; content survives as JSON corpus | Have to drive own distribution; competitive risk from TripSit v2 |
| **B. TripSit upstream PR (mechanism content only)** | 8-12hr CC / 2wk team | Acceptance risk (TripSit may decline/stall) | 100x distribution from day one; aligned with upstream community; lower liability surface | No UX control; can't ship multi-substance UI; content is at TripSit's editorial discretion |
| **C. Content corpus first (markdown repo), UI later** | 12-15hr CC / 3wk team for v0.1; +10hr CC for v0.2 UI | Slower visible progress | Content validated by readers before UI investment; UI architecture informed by real content | Two-stage launch confuses audience; visible product comes later |
| **D. Both A + B parallel** | 18-22hr CC / 4wk team | Coordination cost | Hedges form factor risk; if TripSit accepts PR, standalone is bonus polish | Slight duplication of mechanism authoring effort |

**Recommendation:** **D — both A + B in parallel**. The mechanism content is the value; we send the *highest-quality 10 entries* as a TripSit PR alongside building the standalone v1. If TripSit accepts, the project's reach explodes and the standalone becomes the showcase / multi-substance-UI / printable-card layer. If TripSit declines or stalls, we still ship v1. The subagent's "do content first, then UI" critique is honored by treating `mechanisms.json` as the deliverable, not a milestone artifact. **This is a USER CHALLENGE — surface at gate** because the user picked architecture A explicitly.

## CEO Step 0D — Mode-specific analysis (SELECTIVE EXPANSION)

Expansions cherry-picked into v1 scope (in blast radius, under 1-day CC effort each):

| Expansion | Why it's in blast radius | Effort | Decision |
|---|---|---|---|
| `overrides.json` for disputed TripSit entries | Safety layer over the data we already load | <2hr CC | **Auto-approve** (P2 boil lake, P1 safety completeness) |
| Service worker (offline guarantee) | Bundle is already built; ~50 lines added | <2hr CC | **Auto-approve** (P1 completeness — design doc's stated use case requires offline) |
| i18n-ready data model (locale-keyed entries, en-only shipped) | Schema-level change to `mechanisms.json`; tiny now, prohibitive retrofit | <1hr CC | **Auto-approve** (P1 completeness, P5 explicit-over-clever) |
| Print/PDF wallet card (CSS `@media print`) | Standard print stylesheet, no JS library | <2hr CC | **Auto-approve** (P1 completeness; serves the festival use case the plan claims) |
| Pluralized emergency numbers (911 + 112 + UK 999 + NUA) | Text content change in EmergencyFooter | <30min CC | **Auto-approve** (P1 completeness; design doc names European festival circuit as audience) |
| Codeberg mirror + Internet Archive snapshot at every release | Two extra Actions workflow steps | <1hr CC | **Auto-approve** (P2 — deplatforming risk is real for this category) |
| Contextual qualifier on every severity chip ("varies by dose/set/setting/body") | Component-level text addition | <30min CC | **Auto-approve** (P1 completeness; screenshot misuse vector is real) |
| Cumulative-risk warning when 3+ substances picked | Component logic addition | <30min CC | **Auto-approve** (P1 safety completeness; pharmacological honesty) |
| Distribution & Launch section in PLAN.md w/ outreach checklist | Documentation only | <30min CC | **Auto-approve** (P5 explicit; subagent finding 7.1) |
| Form factor section explicitly naming + dismissing alternatives | Documentation only | <30min CC | **Auto-approve** (P5 explicit; subagent finding 4.4) |

**Deferred to v2 (out of blast radius or > 1day CC):**

| Item | Why deferred |
|---|---|
| Telegram/Discord bot consuming `mechanisms.json` | Out of v1 form-factor scope; requires hosting + auth surface; v2 consumes the v1 content API |
| Full i18n translation (es/fr/pt/de mechanism entries) | Translation effort itself is the work; schema is ready in v1, content lands in v2 |
| Actual TripSit PR submission | Will be done in parallel after v1 mechanism content meets quality bar; PR composition deferred until 10 entries are clinician-reviewed |
| User-facing analytics/telemetry decision | Surfaced at gate as taste; default is no analytics, but reasonable arguments exist for k-anonymous aggregate counts |

## CEO Step 0E — Temporal interrogation (Hour 1 → Hour 6+)

| Time | What's happening |
|---|---|
| Hour 1 | M0: bun init, Vite + TS + Tailwind v4 scaffold, smoke build |
| Hour 2-3 | M1: types + data load + combo lookup + synonym resolution + tests |
| Hour 4-6 | M2: SubstancePicker + ComboGrid + SeverityChip + worst-case banner + hash router |
| **HOUR 7+** | M3: mechanism content authoring — the bottleneck |
| Hour 7-15 | First 10 mechanism entries authored at high quality (1hr each); submit to clinician for review |
| Hour 15-25 | Clinician feedback incorporated; entries 11-30 drafted |
| Hour 25-40 | Entries 31-50 + clinician review of remaining batch + edge cases |
| Hour 40-45 | M4: TimelineStrip + DrugDetail |
| Hour 45-48 | M5: EmergencyFooter + EmergencyView + DisclaimerBanner + AboutView |
| Hour 48-52 | M6: a11y audit + Lighthouse 90+ pass |
| Hour 52-55 | M7: deploy pipeline + Codeberg mirror + Internet Archive snapshot |
| Pre-launch | Lawyer review (1hr consult) — **SHIP GATE** |
| Pre-launch | Clinician sign-off on all 50 entries — **SHIP GATE** |
| Pre-launch | Distribution outreach to DanceSafe, MAPS, PsychonautWiki, KnowDrugs |
| Pre-launch | TripSit upstream PR with 10 highest-quality entries |

**Revised total estimate:** ~55hr CC + lawyer/clinician review (calendar wall-clock 4-6 weeks including reviews). Subagent's "40-60hr for content alone" prediction is incorporated as Hours 7-40.

## CEO Step 0F — Mode selection confirmation

**SELECTIVE EXPANSION confirmed.** v1 core scope (combo planner + mechanism content + emergency footer + per-substance pages) holds. 10 expansions auto-approved into v1 (above). 4 items deferred to v2. 8 items surfaced at the final approval gate (user challenges + taste decisions).

## Phase 1 Section Reviews

### Section 1 — Architecture (CEO lens)

**Subagent main finding (cross-phase):** `mechanisms.json` should be designed as a public API consumable by future renderers (bot, embed, PDF generator), not as a private bundled asset.

**Main voice:** Agree. Architectural cost is near zero — design the JSON schema with stable IDs, versioning, locale keys, and explicit contracts now. Auto-decide: schema spec ships in M1 as `data/SCHEMA.md`. Adds ~30min to M1 effort.

### Section 2 — Error & Rescue Registry

| Error condition | UI rescue | Audit |
|---|---|---|
| User picks 1 substance only | "Pick a second substance to see combo risk" hint | UX hint, not error |
| User picks 5+ substances | Cap at 4; show "Maximum 4 substances; cumulative effects above 4 are not pharmacologically modeled" | New requirement from premise revision |
| User picks substance that resolves to nothing in TripSit dataset | "No data for [substance]. Consider checking PsychonautWiki for [substance]." with link | New: external referral |
| TripSit data has a known disputed entry | `overrides.json` lookup → show "this combo's severity has been disputed because Y" annotation | New requirement from premise revision |
| 3+ substances picked | Banner: "Cumulative risk for 3+ substances is not modeled. Pairwise tiles below show 2-substance interactions only. Treat any 3+ combo as elevated risk by default." | New requirement |
| `mechanisms.json` lookup fails (no matching pattern) | Fall back to TripSit's `combos[].note` + "no mechanism explainer authored for this pair yet — see [TripSit source]" | Graceful degradation |
| Offline + cache miss | Service worker shows "Offline; this combo lookup not in cache. Try [other combos] you've viewed before." | New requirement (service worker = v1 now) |
| Print stylesheet fails | Standard fallback to screen rendering | Low priority |
| Substance synonym ambiguous | Show disambiguation dropdown ("DXM" → cough syrup vs. dextromethorphan PSA) | Edge case |

### Section 3 — Failure Modes Registry

| Failure mode | Probability | Impact | Mitigation in revised plan |
|---|---|---|---|
| Mechanism content factually wrong → death | Low-Med | **Critical** | Clinician review as v1 ship gate (new) |
| User screenshots green chip and posts "see the website says it's fine" | Med-High | High | Contextual qualifier on every chip (new); cumulative-risk warning when 3+ (new) |
| TripSit data has dispute we ship as-is and someone is harmed | Low | Critical | `overrides.json` layer (new) |
| Lawsuit alleging negligent provision of first-aid info | Low | Critical | Lawyer review as v1 ship gate (new); reconsider whether to ship specific first-aid steps or only "call 911" |
| GitHub Pages / Cloudflare deplatforms for "drug content" | Med | High (revised UP from Low) | Codeberg + Internet Archive mirror (new); Tor mirror plan documented |
| TripSit ships v2 of combo.tripsit.me that obsoletes this | Med | Med | Parallel TripSit PR submission strategy (new) |
| Mechanism content authoring time blows out → never ships | High (was hidden) | High | Rebudget to 40-60hr; phase 10 entries first; ship v0.1 content corpus before UI complete |
| Site ships, nobody finds it → mechanism content sits unread | High | High | Distribution & Launch section as ship gate (new); outreach to DanceSafe / TripSit / PsychonautWiki / KnowDrugs / Reddit / HN before launch |
| Non-US user hits emergency footer with US-only 911 number → no help | Med | High | Pluralized emergency numbers (new) |
| Site works on first load, fails on bad connectivity at festival | Med | Med | Service worker in v1 (new) |
| User picks 3+ substances, sees only pairwise tiles, thinks it's a complete model | High | High | Cumulative-risk warning banner (new) |
| Mechanism content quality is uneven; first 10 are great, last 40 are filler | Med | Med | Phase: ship v0.1 with 10 high-quality entries; backfill rest with quality bar maintained |

### Sections 4-10 (Code Quality, Test Review, Performance, Security, etc.)

These are eng-review territory. CEO defers to Phase 3 (Eng Review). Pre-flagged for Eng reviewer:
- `mechanisms.json` schema needs explicit type definition + versioning
- Service worker is now v1 scope (was deferred); Eng to review caching strategy
- `overrides.json` requires test coverage for override-applied paths
- Cumulative-risk-warning when 3+ substances picked is new logic requiring tests
- Print stylesheet is new scope (CSS work, no test)
- Internet Archive snapshot + Codeberg mirror require Actions workflow additions

### Section 11 — Design (cross-handoff to Phase 2)

Subagent surfaced critical design concerns. Handed to Phase 2 reviewer:
- Screenshot misuse: reconsider whether "Low Risk & Synergy" should be a visible green chip
- Emergency footer over-designed for the wrong moment if planner-context is the primary user
- Print stylesheet design (4×6 wallet card format)
- Severity chip + qualifier text composition

## CEO Consensus table (single-voice mode)

```
CEO DUAL VOICES — CONSENSUS TABLE  [subagent-only: codex unavailable]
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Subagent  Status
  ──────────────────────────────────── ─────── ───────── ──────────
  1. Premises valid?                   Revised  Revised  CONFIRMED (revised together)
  2. Right problem to solve?           Yes      USER CHALLENGE  → SURFACE
  3. Scope calibration correct?        Mostly   USER CHALLENGE  → SURFACE
  4. Alternatives sufficiently explored? Yes (D) No (4 alt forms missing) DISAGREE → resolved by Alt D
  5. Competitive/market risks covered? No (was) Yes (now) CONFIRMED (added)
  6. 6-month trajectory sound?         At risk  At risk  CONFIRMED (mitigations added)
═══════════════════════════════════════════════════════════════
N/A for codex column — codex binary unavailable on this machine.
```

## Decision Audit Trail (CEO phase)

| # | Decision | Class | Principle | Rationale |
|---|---|---|---|---|
| 1 | Tighten Premise 1 (info-reduces-harm) language | Mechanical | P5 explicit | Subagent 2.1 cited; honesty about evidence base |
| 2 | Add `overrides.json` layer | Mechanical | P1+P2 | Safety lake; known TripSit data disputes exist |
| 3 | Reframe Premise 7 + add cumulative-risk warning when 3+ substances | Mechanical | P5 explicit | Pharmacological honesty; subagent 2.3 cited |
| 4 | Dual-license: TripSit-derived = CC BY-NC-SA, original = CC BY-SA + MIT | Mechanical | P1 completeness | Preserves HR-org redistribution path |
| 5 | Drop "privacy is the moat" framing | Mechanical | P5 explicit | Subagent 2.5 cited |
| 6 | Rebudget mechanism authoring to 40-60hr | Mechanical | P5 explicit | Subagent 3.2; honest sizing |
| 7 | Service worker in v1 | Mechanical | P1+P2 | Festival use case requires offline; <2hr CC |
| 8 | i18n-ready data model in v1 (en-only ships) | Mechanical | P1+P5 | Marginal cost now; prohibitive retrofit |
| 9 | Print/PDF wallet card in v1 | Mechanical | P1+P2 | Festival use case; <2hr CC |
| 10 | Pluralized emergency numbers (911+112+999+NUA) | Mechanical | P1 | EU audience stated; <30min CC |
| 11 | Codeberg mirror + Internet Archive snapshot per release | Mechanical | P2 | Real deplatforming risk; <1hr CC |
| 12 | Contextual qualifier text on every severity chip | Mechanical | P1+P2 | Screenshot misuse vector |
| 13 | Cumulative-risk warning banner when 3+ substances | Mechanical | P1+P2 | Pharmacological honesty; new safety surface |
| 14 | Add Distribution & Launch section + outreach checklist as ship gate | Mechanical | P5+P6 | Subagent 3.1/7.1; docs change |
| 15 | Add Form Factor section explicitly comparing alternatives | Mechanical | P5 explicit | Subagent 4.4 |
| 16 | Audit PsychonautWiki sidebar content for 10 priority combos before authoring | Mechanical | P3 pragmatic | Save authoring effort if upstream already good |
| 17 | Add KnowDrugs to landscape; differentiate explicitly | Mechanical | P5 explicit | Subagent 5.3 |
| 18 | Add TripSit-v2 competitive risk to risk table | Mechanical | P5 explicit | Subagent 5.1 |
| 19 | Reclassify deplatforming impact Low→High | Mechanical | P5 explicit | Subagent 6.4 |
| 20 | Approach D: build standalone v1 AND submit TripSit upstream PR in parallel | **Taste** | P1+P6 | Hedges form-factor risk; surfaced at gate |
| 21 | **USER CHALLENGE**: Reorder to ship `mechanisms.md` corpus as v0.1 before UI | **User challenge** | — | Subagent 1.1/8.1; user picked Vite+TS UI architecture |
| 22 | **USER CHALLENGE**: Lawyer review + clinician sign-off as v1 SHIP GATES (not "if reachable") | **User challenge** | — | Subagent 3.3/6.1; significant scope addition; not auto-decidable |
| 23 | **USER CHALLENGE**: Make distribution outreach a ship gate (must have ≥1 of: TripSit PR accepted, DanceSafe/MAPS commitment, HN/Reddit launch artifact) | **User challenge** | — | Subagent 3.1/7.1; user did not specify distribution plan |
| 24 | **Taste**: Rewrite target user as "planner-context, 24-48hr pre-use" with festival-midnight as secondary | Taste | — | Subagent 1.2; design implications |
| 25 | **Taste**: Remove green ("Low Risk & Synergy") chip in favor of always-prose rendering | Taste | — | Subagent 6.2; screenshot misuse mitigation tradeoff |
| 26 | **Taste**: Add k-anonymous aggregate analytics (Plausible/Umami self-hosted) | Taste | — | Subagent 8.4; iteration vs. zero-tracking purity |
| 27 | **Taste**: Reconsider whether to ship specific first-aid steps in v1, or strip to "call 911/hotline" | Taste | — | Subagent 3.3 alternative; liability vs. value tradeoff |

**Auto-decided (mechanical):** 20 items, applied to plan structure.
**Taste decisions:** 4 items, surfaced at final gate.
**User challenges:** 3 items, surfaced at final gate with clear "user direction default + change cost" framing.

## CEO completion summary

Plan revised with 20 mechanical auto-decisions and 7 items surfaced for the final approval gate. The core direction (static web app with combo planner + mechanism content + factsheets) is preserved. The major shifts are: safety hardening (`overrides.json`, clinician review gate, lawyer review gate, cumulative-risk warning, qualifier text, pluralized emergency numbers), authoring honesty (40-60hr budget, 10-entry quality-first phase), distribution rigor (outreach as ship gate, TripSit PR in parallel), and resilience (service worker, dual-licensing, Codeberg + IA mirrors, i18n-ready data model). The subagent's "wedge is misidentified" critique is partially honored (content is now treated as the asset; UI as the renderer) but not via milestone reorder — surfaced as user challenge.

**PHASE 1 COMPLETE.**
> **Phase 1 complete.** Subagent: 28 findings across 8 dimensions (5 critical, 7 high, 7 medium-high, 6 medium, 1 low, 2 ranges). Main voice agrees on 22, partial-agrees on 5, disagrees on 1 ("distribution as PRECONDITION" — softened to ship-gate). Consensus: codex unavailable → single-voice review only. 20 auto-decided. 4 taste + 3 user challenges surfaced at final gate. Passing to Phase 2 (Design).

---

# /autoplan — DESIGN REVIEW (UI scope = yes)

**Voices:** Claude main + Claude independent design subagent. **Codex: unavailable** → `[subagent-only]` mode.

## Design Litmus Scorecard

| # | Dimension | As-planned | After auto-decided fixes | Composite |
|---|---|---|---|---|
| 1 | Information hierarchy | 5/10 | 9/10 | Banner-first restructure, sticky emergency bar |
| 2 | Missing states | 3/10 | 8/10 | 11 unspecified states designed below |
| 3 | User journey + emotional arc | 4/10 | 8/10 | Panic-context elevated; return-visit added |
| 4 | Specificity | 3/10 | 9/10 | Every component pattern locked |
| 5 | Visual / screenshot safety | 2/10 | 9/10 | Green chip killed; qualifier always rendered |
| 6 | Accessibility | 6/10 | 9/10 | Token spec; reduced motion; touch sizes; dark-first |
| 7 | "Haunt the implementer" | 3/10 | 9/10 | 14 lock-decisions documented |
| **Composite** | | **3.7/10** | **8.7/10** | One focused design session, not a re-plan |

## Auto-decided design specs (all in M0/M2 scope)

### Typography (locked)
- **UI**: Inter, self-hosted (woff2 subsetted Latin), weights 400/500/600
- **Mechanism prose**: Source Serif 4, self-hosted (slows reader; NYT/Stat News pattern for medical content)
- **Numerals/timeline**: JetBrains Mono (tabular)
- Sizes (mobile): display 24px/600, body 16-18px/500, prose 17px/400 @1.55, qualifier 13px italic, caption 12px
- No Google Fonts CDN (privacy + offline)

### Color (dark-first, WCAG AA + color-blind safe)
- **Background**: `bg-base #0F172A`, `bg-elevated #1E293B`, `bg-overlay #334155` (dark); `#FFFFFF / #F8FAFC` (light)
- **Severity dark-mode hexes** (each paired with shape-distinct icon):
  - Synergy → `#94A3B8` slate-400 + info-circle (NOT green; see C1 below)
  - Low-risk/no-synergy → `#60A5FA` blue-400 + check-circle
  - Low-risk/decrease → `#A78BFA` violet-400 + down-arrow
  - Caution → `#FBBF24` amber-400 + warning-triangle
  - Unsafe → `#FB923C` orange-400 + exclamation-octagon
  - Dangerous → `#F87171` red-400 + diagonal stripe pattern overlay + skull-and-crossbones
- **All severity tiles ship pattern OR shape difference, not color alone** — defends against deuteranopia/protanopia (the exact failure mode for red/green severity)
- Dark mode is **default**; `prefers-color-scheme` honored; manual toggle in menu

### Interaction patterns (locked — no developer discretion at build time)

| Pattern | Locked spec | Reference |
|---|---|---|
| Substance picker | WAI-ARIA Combobox with inline autocomplete; full-width 56px text input; chips below at 44px tap; `+` button at chip-size after each substance; 5th attempt disabled with helper text; synonym ambiguity = two-row dropdown with disambiguator | W3C ARIA APG |
| Mechanism explainer | Bottom sheet rising to 75vh on tap; 4×36px drag handle; translucent scrim preserving worst-case banner peek; drag-to-dismiss, × button top-right, backdrop tap | Apple HIG Sheets, Material 3 Bottom Sheets, Vaul pattern |
| Worst-case banner | 88px full-width band; severity color at 20% bg + 4px left stripe; 32px icon; 24px/600 headline; 16px subhead; 13px italic qualifier "Worst of N pairwise; cumulative not modeled"; NOT sticky (banner scrolls; emergency bar is the sticky element) | — |
| Cumulative-risk warning (3+ subs) | Black bg warning bar replacing worst-case banner when N≥3; pairwise tiles collapsed behind "Show pairwise estimates ▼"; aviation cockpit caution/warning/advisory pattern | Aviation HF guidelines |
| Emergency action bar | `position: fixed; bottom: 0`, height 64px; full-width; 50/50 split: `[⚠ Emergency]` (opens `/emergency`) and `[📞 Call 911 / 112]` (region-detected `tel:` link via `navigator.language`); solid neutral-dark bg (not severity-red — desensitization risk) | Material persistent bottom nav |
| Disclaimer | Modal interstitial on FIRST picker interaction (not page load — gives the picker time to be visible); two buttons "I understand" + "Emergency now"; `localStorage` ack, 90-day re-show; reference GOV.UK cookie banner pattern slowed for safety content | GOV.UK Design System |
| Override-applied annotation | Inline pill badge "📌 Reviewed — disputed" in warm-gray on cream (not severity color); popover with dispute summary + source link | Wikipedia "disputed" template |
| Touch targets | 44×44px minimum (Apple HIG); document `spacing-11 = 44px` in Tailwind config | Apple HIG, Material |
| Animation | Honor `prefers-reduced-motion: reduce`; all sheet slides → opacity fades; expansion animations → instant; use Tailwind `motion-safe:` / `motion-reduce:` variants | WCAG 2.3.3 |
| Empty state | Picker + 3 sample combos as starter chips ("Try: MDMA + alcohol", etc., picking common dangerous combos) + 1-line tutorial + emergency bar present | — |
| Loading state | Server-rendered HTML shell (Vite static HTML) with disclaimer + empty picker + emergency bar pre-rendered → no spinner ever | — |
| Return-visit retention | `localStorage` stores last-3 combos viewed; on return-visit (post-disclaimer-ack), picker shows "Recently checked:" row of tappable chips above input; "Clear" link; never leaves device | — |
| Malformed share URL | Forgiving correction: render picker with valid substances + inline "Couldn't find 'X' — did you mean **Y**? [Tap to add]" | — |

### Cross-phase confirmed (auto-decided from CEO+Design agreement)

The CEO review surfaced these as taste/user-challenge. The Design subagent independently flagged them as critical. **Cross-phase agreement = auto-decided**, removed from gate:

- **Kill the green "Low Risk & Synergy" chip.** Rename to "Reported Synergy" in slate-blue (not green); pair with info-circle (not checkmark). Synergy ≠ safety. The screenshot misuse vector is too high. *Was CEO decision #25 surfaced at gate — now auto-decided.*
- **Qualifier text baked into every severity chip and tile**, never collapsed, never optional. "Varies with dose, set, setting, body, batch." *Reinforces CEO decision #12 — now mandatory at chip level.*
- **OG share card hides severity entirely**. Generic product card with combo title + emergency hotline only. *Open question #10 — resolved as firm requirement.*
- **Disclaimer becomes modal interstitial** on first picker interaction (not banner). *Open question #3 — resolved.*
- **Sticky emergency action bar (64px) on every screen** replaces the bottom emergency footer. *CEO decision #14 (distribution) is separate; this is the UI element.*

### M0 design tokens delivery

M0 (project setup) expands by ~1.5hr CC to deliver design tokens before M2 starts:
- Tailwind config with full color/spacing/typography tokens
- Self-hosted font subset files in `public/fonts/`
- Dark mode default + manual toggle component
- Reduced-motion variants documented
- Touch-target spacing token
- Severity color/icon/pattern tokens
- Print stylesheet skeleton (full content spec in M5)

### M5 expansions (emergency view + print + recovery position SVG)

| Item | Effort | Owner |
|---|---|---|
| `/emergency` view full layout (per Design spec) | 1hr CC | Dev |
| Region-detected `tel:` chain (navigator.language → primary hotline) | 30min CC | Dev |
| Recovery-position SVG diagram (3-state, CC-licensed; source from NHS UK pattern or commission) | 1hr CC | Dev + sourcing |
| Print wallet card layout (4×6 portrait, full spec rendered to dedicated print stylesheet) | 1.5hr CC | Dev |
| "Print this combo card" button affordance in MechanismExplainer | 15min CC | Dev |
| Pattern overlay for Dangerous chip (diagonal stripes survive B&W print + color-blind) | 30min CC | Dev |

Total M5 expansion: ~5hr CC added to original M5 (was 1.5hr); revised M5 = ~6.5hr.

### Print wallet card spec (4×6 portrait)

Locked layout — implementer follows precisely:
- Top: brand + combo title (14pt) + worst-case headline (18pt, severity stripe on left, B&W pattern overlay)
- Mid: "What's happening" (mechanism prose), "Watch for" (bullets), "First aid" (numbered steps), "Timeline" (monospaced unicode blocks)
- **Bottom 1.5 inches**: inverted emergency block (white text on black) — phone numbers (911 US / 112 EU / 999 UK / NUA US) + attribution. **This sits at the edge of the wallet, visible without removing the card.**
- Pattern-not-color severity (diagonal=Dangerous, horizontal=Unsafe, solid border=Caution, dotted=Low-risk) — survives B&W thermal printers + color-blind users
- "printed [date]" stamp encouraging reprints when data updates
- 10pt body minimum (readable in low light)

## Decision Audit Trail (Design phase)

| # | Decision | Class | Principle | Rationale |
|---|---|---|---|---|
| D1 | Adopt full typography spec (Inter / Source Serif 4 / JetBrains Mono, self-hosted) | Mechanical | P5 explicit | Subagent H2; locks ambiguity that would haunt implementer |
| D2 | Adopt full color spec with severity hexes + shape-distinct icons + pattern overlay for Dangerous | Mechanical | P1 completeness | Subagent C1 + accessibility; WCAG AA + color-blind safe |
| D3 | Dark mode is default; `prefers-color-scheme` + manual toggle | Mechanical | P1 | Festival use case; subagent H1 |
| D4 | WAI-ARIA Combobox pattern for SubstancePicker (with inline autocomplete) | Mechanical | P5 explicit | Subagent C4; locks pattern |
| D5 | Mechanism explainer = bottom sheet at 75vh with drag dismiss | Mechanical | P5 explicit | Subagent C5; preserves banner context |
| D6 | Worst-case banner = 88px tinted band, non-sticky | Mechanical | P5 explicit | Subagent H8 |
| D7 | Cumulative-risk warning (N≥3) = black bar replacing banner; pairwise collapsed | Mechanical | P1+P5 | Subagent C3; pharmacological honesty in UI |
| D8 | Sticky emergency action bar (64px, 50/50 buttons, region-detected tel link) | Mechanical | P1+P2 | Subagent C2 — critical UX safety |
| D9 | Disclaimer = modal interstitial on first picker interaction, 90-day re-show | Mechanical | P5 explicit | Subagent H7; open question #3 resolved |
| D10 | KILL green "Low Risk & Synergy" → "Reported Synergy" slate-blue + info-circle | **Cross-phase auto** | P1+P2 | CEO #25 + Design C1 agreement; screenshot misuse closed |
| D11 | Qualifier text baked into every chip; never collapsed | Mechanical | P1+P2 | CEO #12 + Design C1; closes misuse vector at chip level |
| D12 | OG share card hides severity entirely (generic product card) | **Cross-phase auto** | P1+P2 | Open question #10 + Design C1 |
| D13 | Touch targets 44×44px minimum globally | Mechanical | P1 a11y | Subagent M4; Apple HIG |
| D14 | Reduced-motion honored (sheet slides → opacity fades) | Mechanical | P1 a11y | Subagent M6; WCAG 2.3.3 |
| D15 | Empty-state picker: 3 starter chips + 1-line tutorial + emergency bar | Mechanical | P1 completeness | Subagent M1 |
| D16 | Loading state: server-render HTML shell (no spinner ever) | Mechanical | P1+P5 | Subagent H4; static + Vite supports it |
| D17 | localStorage last-3 recent combos for return-visit | Mechanical | P3 pragmatic | Subagent M5; analytics-free retention signal |
| D18 | Malformed share URL → forgiving correction (did-you-mean) | Mechanical | P1 completeness | Subagent M2 |
| D19 | Override annotation = inline pill badge + popover (Wikipedia "disputed" pattern) | Mechanical | P5 explicit | Subagent H5 |
| D20 | Print wallet card: 4×6 portrait, inverted emergency block at bottom 1.5", pattern-not-color severity | Mechanical | P1 completeness | Subagent print spec; serves festival use case |
| D21 | Recovery-position SVG diagram (3-state, sourced from NHS UK CC content) | Mechanical | P1 completeness | Subagent M7; concrete deliverable |
| D22 | `/emergency` view: primary CALL 911 button (72px), secondary CALL NUA, OD signs, recovery position SVG, additional hotlines | Mechanical | P1+P5 | Subagent emergency UI spec |
| D23 | Region-detected emergency tel chain via navigator.language (en-US→911, en-GB→999, EU→112) | Mechanical | P1 | Subagent C2; serves non-US users |
| D24 | M0 expands ~1.5hr to deliver design tokens before M2 starts | Mechanical | P5 explicit | Sequencing: tokens lock first, components follow |
| D25 | M5 expands to ~6.5hr (was ~1.5hr) for full emergency + print + SVG content | Mechanical | P1 completeness | Subagent; honest sizing |
| D26 | First-aid content shape (specific steps vs. "call 911 only") | **Taste/User Challenge** | — | Subagent C6 + CEO #27; depends on lawyer review answer; surface at gate |

## Design Consensus table (single-voice mode)

```
DESIGN DUAL VOICES — CONSENSUS TABLE  [subagent-only: codex unavailable]
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Subagent  Status
  ──────────────────────────────────── ─────── ───────── ──────────
  1. Information hierarchy correct?    5/10    5/10     CONFIRMED — fix together (banner-first restructure)
  2. Missing states designed?          3/10    3/10     CONFIRMED — fix together (11 states locked above)
  3. User journey emotional arc?       4/10    4/10     CONFIRMED — fix together (panic-context elevated)
  4. Specificity sufficient?           3/10    3/10     CONFIRMED — fix together (14 lock-decisions)
  5. Screenshot/visual safety?         2/10    2/10     CONFIRMED — fix together (green chip killed)
  6. Accessibility planned?            6/10    6/10     CONFIRMED — fix together (token spec)
  7. "Haunt the implementer"?          3/10    3/10     CONFIRMED — fix together (locks above)
═══════════════════════════════════════════════════════════════
Codex column N/A (binary unavailable). Cross-phase confirmation with CEO on
items D10/D11/D12 — flagged as high-confidence themes.
```

## Cross-phase themes confirmed in Phase 2

These were flagged in BOTH CEO (Phase 1) and Design (Phase 2) reviews independently. High-confidence:

1. **Screenshot misuse defense (CEO #25 + Design C1)** → Green chip killed; qualifier text mandatory; OG card severity-free. **Resolved.**
2. **Emergency UI placement (Design C2)** → Sticky action bar replaces bottom footer. **Resolved.** (CEO did not surface this independently — Design caught it.)
3. **First-aid content shape (CEO #27 + Design C6)** → Both phases flag as blocking taste decision dependent on lawyer review. **Still at gate.**
4. **Honest pharmacology in UI (CEO #13 + Design C3)** → Black warning bar + collapsed pairwise when N≥3. **Resolved with concrete UI spec.**

## Design completion summary

Composite design rating moves from **3.7/10 as-planned → 8.7/10 after fixes**. 25 mechanical auto-decisions adopted, all within revised milestone budget (M0 +1.5hr, M5 +5hr). One taste decision remains at the final gate: first-aid content shape (depends on lawyer-review outcome, which is itself a user-challenge at the gate). No design-only user challenges. All design improvements are inside the architecture decisions the user already made; no scope expansion or contraction.

**PHASE 2 COMPLETE.**
> **Phase 2 complete.** Subagent: 22 findings across 7 dimensions (6 critical, 8 high, 7 medium, 3 low). 25 auto-decided. 1 taste decision remaining (cross-referenced with CEO #27, single gate-item shared). Cross-phase confirmed: green chip kill, qualifier text mandatory, OG severity-hidden, sticky emergency bar. Passing to Phase 3 (Eng).

---

# /autoplan — ENG REVIEW

**Voices:** Claude main + Claude independent engineering subagent. **Codex: unavailable** → `[subagent-only]` mode.

## Step 0 — Scope challenge: honest cost

The engineering subagent's structural critique is correct: **CEO and Design phases added ~8 architecturally significant features (service worker, overrides, i18n keying, print stylesheet, region-detected tel chain, recovery position SVG, Codeberg+IA mirror, dual-licensing) under "auto-decided <2hr CC" labels without engineering costing them.** Real budget is 75-95hr CC, not 55hr. Mechanism content authoring (33hr) is unchanged; everything around it doubles.

| Item | Original estimate | Engineered estimate | Δ |
|---|---|---|---|
| M0 setup + design tokens | 2hr | 3hr | +1 |
| M1 data layer + schema spec + validator | 1.5hr | 6hr | +4.5 |
| M2 picker + combo grid + router edge cases | 2hr | 5hr | +3 |
| M3 mechanism content authoring | 33hr | 33hr | — |
| M4 timeline + drug detail | 2hr | 3hr | +1 |
| M5 emergency + print + SVG + region tel + recovery position | 6.5hr | 9hr | +2.5 |
| M6 a11y + Lighthouse + cross-browser + axe-core | 3hr | 5hr | +2 |
| M7 deploy + Codeberg + IA + drift check | 1hr | 4hr | +3 |
| Service worker (CEO #7) | 2hr | 6hr | +4 |
| Overrides system (CEO #2) | 2hr | 4hr | +2 |
| i18n plumbing (CEO #8) | 1hr | 2hr | +1 |
| Test backlog beyond current plan | 0hr | 8hr | +8 |
| Privacy/CSP/security audit + fixes | 0hr | 3hr | +3 |
| Supply-chain hardening | 0hr | 1hr | +1 |
| Reproducible-build verification | 0hr | 1hr | +1 |
| **Total** | **55hr** | **~93hr** | **+38hr** |

**This is a TASTE DECISION surfaced at the gate**: accept honest 80hr scope, OR cut to ~55hr by deferring (service worker -6, Codeberg/IA automation -3, i18n -2, print wallet card -5 = ~16hr saved → ~77hr; would need to also defer overrides v1 → v1.1 to land closer to 55hr, but overrides is a safety layer that's hard to defer responsibly).

## Step 1 — Architecture (ASCII dependency graph)

```
                              ┌─────────────────┐
                              │   index.html    │
                              │  (Vite shell)   │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │     main.ts     │
                              └────────┬────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
        ┌─────────▼──────┐    ┌────────▼────────┐  ┌────────▼────────┐
        │  router.ts     │    │  data/load.ts   │  │ styles/         │
        │  (validates    │    │  + indexBuilder │  │ tailwind.css    │
        │   slugs, hash  │    │  (precomputed   │  │ + design tokens │
        │   normalize)   │    │   at build)     │  └─────────────────┘
        └────────┬───────┘    └────────┬────────┘
                 │                     │
                 │           ┌─────────┼─────────┬─────────────────┐
                 │           │         │         │                 │
                 │   ┌───────▼──┐ ┌────▼─────┐ ┌─▼──────────────┐ │
                 │   │tripsit   │ │mechanism │ │ overrides.json │ │
                 │   │.lean.json│ │s.json    │ │ + apply-       │ │
                 │   │(pinned,  │ │+ SCHEMA  │ │ overrides.ts   │ │
                 │   │stripped) │ │.md/.ts   │ │ (stale-hash    │ │
                 │   └──────────┘ │ (locale  │ │  fails build)  │ │
                 │                │  keyed)  │ └────────┬───────┘ │
                 │                └─────┬────┘          │         │
                 │                      │               │         │
                 │                ┌─────▼───────────────▼─────────▼┐
                 │                │   scripts/validate-            │
                 │                │   mechanisms.ts  (CI gate)     │
                 │                │   scripts/lint-mechanisms.ts   │
                 │                │   scripts/apply-overrides.ts   │
                 │                └─────────────┬──────────────────┘
                 │                              │
                 │   ┌─────────┬─────────┬──────┴──────┬─────────┐
                 │   │         │         │             │         │
                 │ ┌─▼──────┐ ┌▼───────┐ ┌▼──────────┐ ┌▼──────┐│
                 │ │lib/    │ │lib/    │ │ lib/i18n  │ │lib/   ││
                 │ │combo.ts│ │synonyms│ │ .ts       │ │timeline││
                 │ │ +cumul │ │.ts +   │ │ (fallback │ │.ts    ││
                 │ │  3+    │ │ambig.  │ │  chain)   │ │       ││
                 │ │warning │ │test    │ │           │ │       ││
                 │ │+overr. │ │        │ │           │ │       ││
                 │ │ apply  │ │        │ │           │ │       ││
                 │ └────────┘ └────────┘ └───────────┘ └───────┘│
                 │                                              │
                 └──────────────────────┬───────────────────────┘
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │           components/                    │
                  │  SubstancePicker (WAI-ARIA combobox,     │
                  │   XSS-safe via branded SubstanceSlug)    │
                  │  ComboBanner (cumulative-3+ warning)     │
                  │  ComboGrid → MechanismExplainer          │
                  │   (bottom-sheet; reads overrides         │
                  │   annotations)                           │
                  │  SeverityChip (color+icon+pattern+       │
                  │   qualifier — type-enforced)             │
                  │  TimelineStrip                           │
                  │  DrugDetail                              │
                  │  EmergencyActionBar (sticky 64px,        │
                  │   navigator.language → tel chain)        │
                  │  EmergencyView (/emergency + recovery    │
                  │   position SVG)                          │
                  │  DisclaimerBanner (modal, versioned ack) │
                  │  AboutView (+ "Clear local data" btn)    │
                  └──────────────────┬───────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   sw.ts             │
                          │   precache static + │
                          │   network-first for │
                          │   mechanisms.json + │
                          │   update toast      │
                          │   CACHE_VERSION =   │
                          │   git short hash    │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  print.css          │
                          │  4×6 wallet card    │
                          │  pattern-not-color  │
                          │  severity           │
                          │  inverted bottom    │
                          │  emergency block    │
                          └─────────────────────┘

  .github/workflows/
  ├── deploy.yml          bun ci → tests → build → GH Pages
  ├── mirror.yml          on release tag → push Codeberg
  ├── archive.yml         on release tag → IA save endpoint
  ├── drift.yml           nightly → compare GH/Codeberg HEAD → issue on drift
  ├── lighthouse-ci.yml   PR gate: Lighthouse mobile ≥85, axe-core a11y, bundlesize
  └── reproducibility.yml on main: build twice, diff -r dist/
```

## Step 2 — Code Quality (DRY, complexity, naming)

- `SubstancePicker` typeahead, `synonyms.ts` alias resolution, and the disambiguation dropdown share text-match logic — extract to `lib/match.ts` (case-insensitive substring + prefix-prioritized scoring). Three components reuse it.
- `severity.ts` ranking and `combo.ts` worst-case picking share an ordering predicate — single source via exported `SEVERITY_ORDER` constant + `compareSeverity()` function.
- `EmergencyActionBar` and `EmergencyView` share the region-detected tel chain — extract to `lib/emergency.ts` (`resolvePrimaryHotline(navigatorLanguage): { tel, label }`).
- Mechanism category-pattern matching (e.g. "stimulant+dissociative") used by both `combo.ts` and the schema validator — single shared module `lib/category-pattern.ts`.

Naming: `comboFor(substances)` ambiguous — clarify as `pairwiseRisksFor(substances)` returning typed `PairwiseRisk[]`; reserve `combo` namespace for the slug/data shape. `worstCase` → `aggregateSeverity` (clearer that it's the max across pairs and the 3+ cumulative-warning marker).

## Step 3 — Test Review (test diagram + gap analysis)

```
USER FLOW                     CODEPATH                       PLANNED?    NEEDED
type "molly"                  synonyms.resolve()              ✓ tests    keep
type "DXM" (ambiguous)        synonyms.resolve → multi        ✗ MISSING  ADD: synonyms-ambiguity.test.ts
pick 2 substances             combo.pairwiseRisksFor()        ✓ tests    keep
pick 3+ substances            combo + cumulative-3+ branch    ✗ MISSING  ADD: cumulative.test.ts + ui.snapshot
pick 5th substance            picker cap-at-4 enforcement     ✗ MISSING  ADD: picker.test.ts
combo has override            overrides.apply → annotate      ✗ MISSING  ADD: overrides.test.ts + stale-hash
visit #/combo/mdma,xyzzy      router.parseHashRoute reject    ✗ MISSING  ADD: router.test.ts (12 cases)
visit #/combo/mdma%2Cket      router decode + parse           ✗ MISSING  ADD: router.encoding.test.ts
visit #/combo/<script>...     router validates slug + XSS     ✗ MISSING  ADD: xss.test.ts
disclaimer dismissed          localStorage.setItem + ack-v1   ✗ MISSING  ADD: storage.test.ts + recovery
network drops mid-session     SW cache fallback strategy      ✗ MISSING  ADD: sw.test.ts (precache + update toast)
open /emergency on EU phone   navigator.language → tel chain  ✗ MISSING  ADD: emergency-region.test.ts (6 locales)
print combo card              @media print rendering          ✗ MISSING  ADD: print.snapshot.test.ts
color-blind severity render   severity tokens completeness    ✗ MISSING  ADD: a11y-tokens.test.ts + axe-core
locale = pt-BR (future)       i18n.resolveLocale chain        ✗ MISSING  ADD: i18n.test.ts
build with stale pin          apply-overrides validates hash  ✗ MISSING  in overrides.test.ts
build with broken mech.json   validate-mechanisms.ts          ✗ MISSING  ADD: schema-validation.test.ts
reproducible build            build twice diff -r             ✗ MISSING  CI workflow (not test)

Planned: ~20 tests (combo, synonyms, severity, timeline)
Missing: ~20 new test files / ~40 cases
Realistic v1 ship target: ~90 tests
```

**Test plan artifact written** to `~/.gstack/projects/maximekoitsalu-partysafe/main-test-plan-20260518-164542.md` (separate file; see audit trail row T1).

## Step 4 — Performance reality check

**Bundle target audit:**
- TripSit `drugs.json` raw is ~370KB → ~95-110KB gzipped. Plus `mechanisms.json` ~75KB raw / ~25KB gzipped. Plus JS ~80KB (target) / CSS ~60KB (target) / fonts ~72KB (subset).
- **If JSON is `import`-ed**, Vite inlines into JS bundle → 250-300KB JS. **Blows the 80KB target.** Must use `fetch` + `<link rel="preload" as="fetch">`.
- Build-time index emission: precompute `Map<canonical-pair, mechanism-id>` lookup at build time; emit as `dist/data/index.json` (~10KB). Eliminates runtime O(n²) scans.
- Lean-mode TripSit JSON: strip `pretty_name`, `experiences`, `links`, etc. → ~30-40% smaller.
- `bundlesize` enforcement: fail CI if JS gzipped > 100KB or CSS > 25KB.
- Lighthouse mobile target: 85 (not 90 — SW install penalty on first load makes 90 unreliable). Document the baseline number in README.

## Step 5 — Security & Privacy audit

| Surface | Risk | Mitigation (locked) |
|---|---|---|
| Hash routes leaked via Referer to external links | Combo slugs leak to PsychonautWiki / TripSit / Wayback when clicking external | `<meta name="referrer" content="no-referrer">` in index.html |
| CSP missing | XSS becomes wormable | `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ...; frame-ancestors 'none'; base-uri 'self'">` |
| SW cache reveals previous lookups on shared device | Privacy across users of same phone | Do NOT cache `#/combo/*` rendered views; cache shell + JSON + assets only; "Clear local data" button in /about |
| localStorage last-3 combos same problem | Same as SW | "Clear local data" button covers; document in PRIVACY.md |
| `innerHTML` assignment in hand-rolled components | XSS | ESLint `no-restricted-syntax` ban; allow only inside named blocks; mechanism prose pre-rendered safe HTML at build time or sanitized via `dompurify` (12KB gz) |
| Hash route XSS via `<script>` payloads | XSS | `parseHashRoute` validates slugs via branded `SubstanceSlug` type that only matches `/^[a-z0-9-]+$/` |
| Source maps with home directory paths | Info disclosure | `vite.config.ts`: `build.sourcemap: false` for prod |
| Supply chain (200+ transitive deps) | Compromise | `bun install --frozen-lockfile`; `bun pm audit` in CI; `ignore-scripts=true`; pinned majors; Renovate weekly; SECURITY.md |
| GitHub account compromise | Repo/Pages hijack | 2FA-required (document in SECURITY.md); GPG-signed release tags; release process documented |

## Step 6 — Service Worker spec (locked)

| File pattern | Strategy | Why |
|---|---|---|
| `index.html` | network-first w/ cache fallback | Entry point updates immediately; offline fallback |
| `assets/*` (Vite-hashed) | cache-first (immutable) | Hashed filenames; never stale |
| `data/tripsit.lean.json` (pinned) | cache-first | Pinned data; only changes on rebuild |
| `data/mechanisms.json` | network-first w/ cache fallback | Live content; updates must reach users |
| `data/overrides.json` | network-first w/ cache fallback | Safety annotations; updates must reach users |
| `/drug/[slug]` routes | precached on install (build-time enumeration) | Guarantees offline for every substance |
| `#/combo/*` rendered views | NOT cached | Privacy: don't reveal lookups across users |

- `CACHE_VERSION` = git commit short hash, injected at build time via Vite define.
- On `controllerchange`: show small "Updated content available — tap to refresh" toast. NOT auto-reload (festival mid-flow disruption).
- SW scope: `/partysafe/` (GH Pages subpath).
- Tests: `src/test/sw.test.ts` covers precache list completeness, network-first fallback, cache-version invalidation, update-toast trigger.

## Step 7 — Schema definitions (locked, must ship before M1)

### `src/data/SCHEMA.md` + `src/data/SCHEMA.ts`

```typescript
// MechanismEntry — the project's public API
type MechanismEntry = {
  schema_version: "1.0.0";           // semver; build fails on mismatch
  id: string;                         // stable kebab-case slug, e.g. "stim-dissoc-caution"
  category_pattern: CategoryPattern;  // typed enum
  severity: Severity;                 // enum matching severity.ts
  locales: {
    en: LocalizedContent;             // required
    [locale: string]: LocalizedContent;  // optional
  };
  sources: Citation[];                // required, ≥1
  reviewed_by: ReviewerRef[];         // required for v1 ship; empty = build warning, ship-gate fails
  reviewed_at: string;                // ISO8601 of latest review
  supersedes?: string;                // entry ID this replaces
  disputed?: { reason: string; source_url: string };
};

type LocalizedContent = {
  mechanism_prose: string;            // ≤80 words; Flesch 70+
  warning_signs: string[];            // ≤5 bullets
  first_aid: string[];                // ≤4 numbered steps (or 1 if severity >= Unsafe → "Call 911")
};

type ReviewerRef = {
  id: string;                         // e.g. "dr-jane-smith"
  name: string;                       // "Dr. Jane Smith, MD"
  credentials: string;                // "Emergency Medicine, NYU Langone"
  reviewed_at: string;                // ISO8601
  asserts: string;                    // e.g. "content accurate as of date"
  url?: string;                       // ORCID/affiliation/personal
};

type Citation = {
  source: string;                     // e.g. "TripSit", "DanceSafe", "Erowid", "PsychonautWiki", "NHS"
  url: string;
  accessed_at: string;                // ISO8601
};
```

### `src/data/overrides.json` schema

```typescript
type OverrideFile = {
  schema_version: "1.0.0";
  applies_to_upstream_hash: string;   // TripSit dataset commit hash; build fails on mismatch
  overrides: Override[];
};

type Override = {
  target: { type: "combo" | "substance"; key: string };
  mode: "annotate" | "replace_severity" | "replace_note";
  payload: any;                       // shape depends on mode
  justification: { source_url: string; summary: string; added_by: string; added_at: string };
  expires_or_review_by: string;       // ISO8601; build warns when within 30 days
};
```

### Build-time validators

- `scripts/validate-mechanisms.ts` — runs on `bun run build` AND CI. Fails on: missing `en` locale, orphaned `category_pattern`, severity that doesn't resolve, duplicate IDs, missing `reviewed_by` (for v1 ship), unreferenced `sources`, malformed ISO8601 dates.
- `scripts/apply-overrides.ts` — produces merged dataset; fails build on `applies_to_upstream_hash ≠ current pin hash`; logs every override applied with audit trail.
- `scripts/lint-mechanisms.ts` — content-level lint: word counts, reading level (Flesch), banned phrases ("safe", "fine", "okay"), required-field completeness.

## Step 8 — i18n locked rules

- `en` is required for every entry. Other locales optional, per-entry.
- Build warns (not fails) when non-`en` locale exists in <100% of entries. Surfaces "partial locale coverage" to keep contributors honest.
- `lib/i18n.ts` `resolveLocale(entry, requestedLocale, fallbackChain)` with tests: exact match, fallback to `en`, missing `en` (build-fail not runtime), `pt-BR → pt → en` chain.
- v1 ships **hardcoded `en`** (no locale switcher in UI). Document explicitly to prevent contributor confusion.
- `emergency_numbers.json` is separate from locale, keyed by region code (US, GB, EU, etc.). Locale = language; region = phone number map. Different axes.

## Step 9 — Hash route normalization (locked)

| Input | Normalized to | Reason |
|---|---|---|
| `#/combo/MDMA,KeTaMine` | `#/combo/mdma,ketamine` | Lowercase canonical |
| `#/combo/mdma,ketamine,mdma` | `#/combo/mdma,ketamine` | Dedupe silent |
| `#/combo/` (empty) | `#/` | Render picker |
| `#/combo/mdma%2Cketamine` | `#/combo/mdma,ketamine` | Decode percent-encoding |
| `#/combo/mdma,ketamine,alc,2cb,lsd` (5) | `#/combo/mdma,ketamine,alc,2cb` + warning | Cap at 4; warn not truncate-silent |
| `#/combo/mdma,xyzzy` | render picker with `mdma` selected + "Couldn't find 'xyzzy' — did you mean Y?" | Forgiving correction (Design D18) |
| `#/combo/<script>alert(1)</script>` | rejected by branded `SubstanceSlug` validator | XSS defense |
| `#/combo/mdma,ketamine#anchor` | parse only first hash | Defensible deterministic |
| picker change (substance added) | `replaceState` | Don't pollute history |
| route navigation (combo→drug) | `pushState` | Back button works |

## Step 10 — File additions required before M1 (auto-decided as ship blockers)

- `src/data/SCHEMA.md` + `src/data/SCHEMA.ts`
- `src/data/OVERRIDES_SCHEMA.md`
- `docs/SERVICE_WORKER.md`
- `docs/MECHANISM_TEMPLATE.md` (with word counts, reading level, banned phrases, reviewer cred format)
- `docs/PRIVACY.md` (every storage/network/identifier touched)
- `SECURITY.md` (supply chain posture, 2FA, GPG, release process, vuln disclosure)
- `scripts/validate-mechanisms.ts`
- `scripts/apply-overrides.ts`
- `scripts/lint-mechanisms.ts`
- `scripts/subset-fonts.ts`
- `.bun-version`
- `.eslintrc.json` with `no-restricted-syntax` rule banning `.innerHTML = ` outside named blocks

## Step 11 — CI workflows (locked)

| Workflow | Trigger | Steps |
|---|---|---|
| `deploy.yml` | push to main | bun install --frozen-lockfile, bun test, bun pm audit, validate-mechanisms, lint-mechanisms, apply-overrides, build, lighthouse-ci, axe-core, bundlesize, deploy GH Pages |
| `mirror.yml` | release tag | push to Codeberg via SSH deploy key |
| `archive.yml` | release tag | curl Wayback save endpoint for `/`, `/index.html`, `/#/about`, `/#/emergency` |
| `drift.yml` | nightly | compare GitHub HEAD to Codeberg HEAD; open issue on drift |
| `reproducibility.yml` | main push | build twice, `diff -r dist-1/ dist-2/`; fail if non-identical |

## Step 12 — Failure-modes registry (top 5)

| # | Failure mode | Likelihood | Blast radius | Mitigation locked |
|---|---|---|---|---|
| 1 | Stale `overrides.json` annotation after pin bump silently misinforms | High (first pin update) | Critical | `applies_to_upstream_hash` validator fails build on mismatch; pin-update PR template; `overrides.stale-hash.test.ts` |
| 2 | Mechanism content authoring stalls; v1 ships partial | Medium-High | High | Phased: v0.1 = 10 entries clinician-approved, v1 = 20, v1.x = backfill. Empty-pattern fallback links upstream TripSit. Lint enforces template. |
| 3 | SW serves stale `mechanisms.json` for days | High (no strategy) | High | Network-first for mechanisms+overrides; `controllerchange` → update toast; `CACHE_VERSION` = git short hash |
| 4 | XSS via picker input or hash route param | Medium (hand-rolled DOM context) | Critical | ESLint ban innerHTML; branded slug type; CSP meta; `xss.test.ts` payload corpus; Referrer-Policy |
| 5 | GH Pages outage mid-festival; Codeberg mirror 47 commits behind | Low-Medium long-term | High | mirror.yml on every release tag; nightly drift.yml; mirror URLs printed on wallet card; README documents fallback path |

## Decision Audit Trail (Eng phase)

| # | Decision | Class | Principle | Rationale |
|---|---|---|---|---|
| E1 | `mechanisms.json` full schema (SCHEMA.md + SCHEMA.ts + validator) before M1 | Mechanical | P1 completeness | F1 — public API, can't be retrofitted |
| E2 | `overrides.json` schema + apply-overrides script + stale-hash failure | Mechanical | P1+P2 | F2 — safety integrity |
| E3 | i18n locked rules: en required, partial-locale warning, hardcoded en in v1 UI | Mechanical | P5 explicit | F3 |
| E4 | Service worker spec locked per route (precache + network-first split) | Mechanical | P1+P2 | F4; rebudget to 6hr (was 2hr) |
| E5 | Hash route normalization rules locked (12 cases) + branded SubstanceSlug | Mechanical | P5 explicit | F5+F11 — XSS defense and UX |
| E6 | Test target: 90 tests (was 50) | Mechanical | P1 completeness | F6 |
| E7 | Bundle architecture: fetch + preload (not import) for JSON; build-time index emission; lean-mode TripSit | Mechanical | P1+P5 | F7 — meets Lighthouse target |
| E8 | Font subsetting to ~72KB total (Inter regular ≤15KB etc.); preload Inter regular only | Mechanical | P1 | F8 |
| E9 | Referrer-Policy: no-referrer meta tag | Mechanical | P1+P2 safety | F9 — closes Referer leak |
| E10 | CSP meta tag with locked directive set | Mechanical | P1+P2 | F9 |
| E11 | SW does NOT cache `#/combo/*` views | Mechanical | P1+P2 privacy | F9 |
| E12 | "Clear local data" button in /about | Mechanical | P1 | F9 |
| E13 | ESLint `no-restricted-syntax` banning innerHTML outside named blocks | Mechanical | P1+P5 XSS | F11 |
| E14 | Mechanism prose pre-rendered safe HTML at build time | Mechanical | P5 | F11 |
| E15 | Branded `SubstanceSlug` type (only via `validateSlug(s)`) | Mechanical | P1+P5 | F11 |
| E16 | `bun install --frozen-lockfile` + `bun pm audit` in CI; `ignore-scripts=true` | Mechanical | P1 | F10 |
| E17 | Pinned majors in package.json; Renovate weekly patch auto-merge; SECURITY.md | Mechanical | P1 | F10 |
| E18 | `.bun-version` + lockfile + deterministic Vite config + reproducibility CI | Mechanical | P1 | F12 |
| E19 | Print stylesheet: `@page` + `print-color-adjust` + SVG patterns; manual test matrix in README | Mechanical | P1 | F13 |
| E20 | Inverted emergency block dark-gray (#222) not pure black to save toner | Mechanical | P3 pragmatic | F13 |
| E21 | mirror.yml + archive.yml + drift.yml as locked workflows | Mechanical | P1 | F14 |
| E22 | Recovery position SVG sourcing: OGL-licensed NHS adaptation OR commissioned CC BY-SA with documented license trail | Mechanical | P5 explicit | F15 |
| E23 | Authoring template in docs/MECHANISM_TEMPLATE.md; lint-mechanisms.ts in CI | Mechanical | P1+P5 | F16 |
| E24 | Empty-pattern fallback in UI: "this combo's mechanism is being reviewed; see [TripSit source]" | Mechanical | P1 | F16 partial-coverage rule |
| E25 | DOM mutation policy: textContent default; named-block exception with sanitizer | Mechanical | P5 | F11 |
| E26 | Lighthouse mobile threshold: 85 (not 90 — SW install penalty); documented baseline in README | Mechanical | P5 honest | F7 |
| E27 | Disclaimer storage key: `disclaimer-ack-v1`; bumping v1.x re-prompts | Mechanical | P5 | "must specify" #12 |
| E28 | localStorage schema: versioned key `recent-combos-v1`, TTL, try/catch corruption recovery | Mechanical | P1+P5 | "must specify" #13 |
| E29 | SeverityChip is a TypeScript type that won't compile without color+icon+pattern+qualifier | Mechanical | P5 type-enforced | "must specify" #9 |
| E30 | Cumulative-warning threshold: simple N≥3 (no category-mix gating in v1); typed predicate in combo.ts | Mechanical | P5 | "must specify" #10 |
| E31 | DRY refactors: lib/match.ts, SEVERITY_ORDER, lib/emergency.ts, lib/category-pattern.ts | Mechanical | P4 DRY | Step 2 |
| E32 | Naming: `pairwiseRisksFor` (clear) over `comboFor` (ambiguous); `aggregateSeverity` over `worstCase` | Mechanical | P5 explicit | Step 2 |
| T1 | Test plan artifact written to ~/.gstack/projects/maximekoitsalu-partysafe/main-test-plan-20260518-164542.md | Mechanical | P5 explicit (autoplan required artifact) | — |
| E33 | **TASTE: 80hr honest scope vs 55hr with cuts (defer SW/Codeberg-IA/i18n/print)** | **Taste** | — | Surface at gate |

## Eng Consensus table (single-voice mode)

```
ENG DUAL VOICES — CONSENSUS TABLE  [subagent-only: codex unavailable]
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Subagent  Status
  ──────────────────────────────────── ─────── ───────── ──────────
  1. Architecture sound?               Yes     Yes      CONFIRMED (with E1-E32 specs)
  2. Test coverage sufficient?         No→Yes  No→Yes   CONFIRMED — 90 tests target
  3. Performance risks addressed?      No→Yes  No→Yes   CONFIRMED — E7 bundle arch, E26 LH threshold
  4. Security threats covered?         No→Yes  No→Yes   CONFIRMED — E9-E18 hardening stack
  5. Error paths handled?              No→Yes  No→Yes   CONFIRMED — overrides stale-hash, SW invalidation
  6. Deployment risk manageable?       Partial Partial  CONFIRMED — E21 mirror+drift workflows
═══════════════════════════════════════════════════════════════
Codex column N/A (binary unavailable). Cross-phase: F4 (SW) + F2 (overrides) +
F1 (schema) all originate from CEO scope additions; eng now backs them with spec.
```

## Cross-phase themes confirmed in Phase 3

1. **Service worker is both critical for the festival use case AND a major engineering cost** — confirms keeping in v1, refines budget +4hr.
2. **`mechanisms.json` is a public API (cross-confirmed CEO #4.3 + Eng F1)** — schema work is mandatory before M1, not a 30-min addition.
3. **Honest 80hr scope vs 55hr cut decision (NEW)** — surfaced at final gate.

## Eng completion summary

32 mechanical engineering decisions auto-decided. 1 taste decision surfaced (80hr vs 55hr with cuts). The plan as originally specced + CEO/Design auto-decisions = 80hr CC. Cuts available (SW, mirror automation, i18n, print) reduce to ~64hr; further cuts risk safety (overrides, SCHEMA) which can't responsibly drop.

**PHASE 3 COMPLETE.**
> **Phase 3 complete.** Subagent: 16 findings + 15 "must specify" items + 5 failure modes. 32 auto-decided. 1 taste decision (budget) surfaced. Cross-phase: SW + schema + overrides confirmed across phases. Phase 3.5 (DX) SKIPPED — no developer-facing scope (end-user product). Passing to Phase 4 (Final Approval Gate).

