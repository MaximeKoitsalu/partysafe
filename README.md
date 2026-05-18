# partysafe

> Harm-reduction combo planner. Static, mobile-first, no tracking. Built on
> TripSit data (CC BY-NC-SA).

Pick 2–4 substances. See worst-case severity, every pairwise risk with a
plain-English mechanism explanation and first-aid guidance, and an onset/
duration timeline.

**This is information, not medical advice.** See [DISCLAIMER.md](DISCLAIMER.md).

## Status

🚧 **Pre-release.** M0 scaffolding complete. M1–M7 in progress. Public launch
gated on clinical review, lawyer review, and distribution outreach (see
[PLAN.md](PLAN.md) "Ship gates").

## What's here today

The current build is structural scaffolding — design tokens, dark mode default,
CSP + Referrer-Policy hardening, severity color preview. The substance picker,
combo grid, mechanism explainer, timeline, and emergency view land in M2–M5.

## Build + run

Requires Bun ≥ 1.3.0.

```bash
bun install --frozen-lockfile
bun run dev        # local dev server on http://localhost:5173
bun run build      # produces static dist/
bun run preview    # serve built dist/ locally
bun run typecheck  # tsc --noEmit
bun run lint       # eslint src
bun run audit      # bun pm audit
```

## Architecture

Static SPA: Vite + TypeScript + Tailwind v4. No runtime framework (no React /
Vue / Svelte). All UI is DOM-native components composed as ES modules. Hash
routing for shareable URLs (`#/combo/mdma,ketamine`, `#/drug/mdma`).

Data sources:
- `src/data/tripsit.json` — pinned commit of TripSit drugs dataset (lands in M1)
- `src/data/mechanisms.json` — original mechanism content authored for this
  project (lands in M3, clinically reviewed before v1 ship)
- `src/data/overrides.json` — safety annotations for known TripSit data
  disputes (lands in M1; build fails on stale pin hash)

## Privacy

- No accounts, no analytics, no cookies, no server inputs
- Combo selections happen client-side; substance slugs in shareable URLs only
- `<meta name="referrer" content="no-referrer">` prevents Referer-header leaks
  to external links
- localStorage is used only for: first-visit disclaimer ack, last-3 recent
  combos for return-visit convenience. Both clearable from /about.

## License

CC BY-NC-SA 4.0 (matching upstream TripSit dataset). See [LICENSE](LICENSE) for
dual-licensing intent for original content and code (finalized before launch).

Credit upstream sources: see [ATTRIBUTION.md](ATTRIBUTION.md).

## Mirrors

Public launch will be hosted at:
- GitHub Pages: https://maximekoitsalu.github.io/partysafe/ (primary)
- Codeberg mirror: TBD (M7)
- Internet Archive: snapshot per release (M7)

This site can be self-hosted from a built `dist/` on any static host or
`file://`. Mirroring is encouraged.

## Reporting issues

- Data classification disputes: report upstream at https://github.com/TripSit/drugs/issues
- Mechanism content corrections: open an issue here
- UI / accessibility / build problems: open an issue here

## Contributing

This is a pre-release scaffold. Contribution guidelines land alongside v1
ship; until then, see [PLAN.md](PLAN.md) for the full roadmap.

## What this is for

People who go out, party, or experiment with substances do so regardless of
information availability. The harm-reduction premise — established by
DanceSafe, the Drug Policy Alliance, the Portuguese / Dutch / Swiss public-
health services, and decades of community-built tools like TripSit and Erowid
— is that informed users have measurably better outcomes than uninformed ones.

This project exists to make that information more accessible at the moment of
decision: on a phone, in a venue, before something irreversible happens.
