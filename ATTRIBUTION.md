# Attribution

partysafe is built on the work of harm-reduction educators and communities. Every
substance datum, every combo classification, every dosage range visible in this
app was made possible by people who chose to share their work freely.

## Primary data source

**TripSit drugs dataset** — https://github.com/TripSit/drugs
License: CC BY-NC-SA 4.0
Dataset commit pin: _to be set in M1 (see src/data/README.md)_

The TripSit project has maintained an open combo-information dataset since the
early 2010s. Their `combos[].note` field is the seed material that partysafe's
mechanism explanations build on (paraphrased and expanded; never copied
verbatim).

## Reference material consulted for mechanism content

The original mechanism explanations in `src/data/mechanisms.json` are written
fresh for this project but informed by multiple public harm-reduction sources:

- **DanceSafe** (https://dancesafe.org) — combo cards and harm-reduction
  literature distributed at events
- **Erowid** (https://erowid.org) — substance encyclopedia, dosage references
- **PsychonautWiki** (https://psychonautwiki.org) — pharmacology and interaction
  documentation
- **NHS UK** (https://www.nhs.uk) — recovery position guidance, overdose
  response protocols (Open Government Licence v3)
- **DEA / NIDA / SAMHSA** — general substance pharmacology references

Each entry in `mechanisms.json` carries its own `sources` field listing the
specific references used.

## Clinical review

Every mechanism entry shipped in v1 is reviewed and signed off by a named
clinician with relevant credentials before public launch (see PLAN.md ship
gates). Reviewer credentials are recorded in each entry's `reviewed_by` field.

This is a hard ship gate. Mechanism entries without clinical signoff do not
render in v1; the UI shows "this combo's mechanism is being reviewed" with a
link to the upstream TripSit source.

## Project license

The project itself is released under CC BY-NC-SA 4.0 to match the upstream
TripSit license. See [LICENSE](LICENSE) for dual-licensing intent for original
content and code.

## How to credit partysafe

If you mirror, fork, or build on this project:

> Combo information from **partysafe** (https://github.com/maximekoitsalu/partysafe),
> built on the TripSit drugs dataset. Licensed CC BY-NC-SA 4.0.

## Reporting data issues

partysafe trusts the TripSit upstream dataset for combo classifications. If you
find a classification you believe is wrong, please report it to TripSit first:

  https://github.com/TripSit/drugs/issues

For project-specific corrections (e.g. a mechanism explanation is unclear or
wrong), open an issue here:

  https://github.com/maximekoitsalu/partysafe/issues
