/**
 * DrugDetail — full per-substance factsheet for #/drug/[slug].
 *
 * Renders from the lean TripSit dataset:
 *   - pretty name + category badges
 *   - summary prose
 *   - dose table (per route of administration × intensity)
 *   - onset / duration (parsed via lib/timeline)
 *   - dose_note + general advice
 *   - aliases
 *   - link to the upstream TripSit wiki for full depth
 *
 * Pure render function (no internal state) — main.ts calls it per route nav.
 * Returns a fallback card when the slug is unknown.
 */

import { el } from "../lib/dom.ts";
import { formatRange, timelineFor } from "../lib/timeline.ts";
import type { LeanDataset, LeanSubstance, SubstanceSlug } from "../types.ts";

const DOSE_INTENSITY_ORDER = ["Threshold", "Light", "Common", "Strong", "Heavy"];

function categoryBadges(categories: string[]): HTMLElement {
  return el(
    "div",
    { class: "flex flex-wrap gap-2" },
    ...categories.map((c) =>
      el(
        "span",
        {
          class:
            "inline-block rounded-full bg-[var(--color-bg-overlay)] px-3 py-1 text-xs font-medium text-[var(--color-fg-primary)]",
        },
        c,
      ),
    ),
  );
}

function doseTable(formatted_dose: Record<string, unknown> | undefined): HTMLElement | undefined {
  if (!formatted_dose || typeof formatted_dose !== "object") return undefined;
  const routes = Object.entries(formatted_dose).filter(
    ([, v]) => v && typeof v === "object",
  ) as Array<[string, Record<string, string>]>;
  if (routes.length === 0) return undefined;

  // Collect the union of intensity columns present, ordered sensibly.
  const intensitiesPresent = new Set<string>();
  for (const [, doses] of routes) {
    for (const k of Object.keys(doses)) intensitiesPresent.add(k);
  }
  const columns = DOSE_INTENSITY_ORDER.filter((i) => intensitiesPresent.has(i));
  const extras = [...intensitiesPresent].filter((i) => !DOSE_INTENSITY_ORDER.includes(i));
  const allColumns = [...columns, ...extras];

  return el(
    "div",
    { class: "overflow-x-auto" },
    el(
      "table",
      { class: "w-full text-sm border-collapse" },
      el(
        "thead",
        {},
        el(
          "tr",
          { class: "border-b border-[var(--color-border)]" },
          el("th", { class: "text-left py-2 pr-3 font-semibold text-[var(--color-fg-muted)]" }, "Route"),
          ...allColumns.map((c) =>
            el("th", { class: "text-left py-2 px-3 font-semibold text-[var(--color-fg-muted)]" }, c),
          ),
        ),
      ),
      el(
        "tbody",
        {},
        ...routes.map(([roa, doses]) =>
          el(
            "tr",
            { class: "border-b border-[var(--color-border)]/40" },
            el("td", { class: "py-2 pr-3 font-medium text-[var(--color-fg-primary)]" }, roa),
            ...allColumns.map((c) =>
              el(
                "td",
                {
                  class: "py-2 px-3 text-[var(--color-fg-primary)] font-[var(--font-mono)] tabular-nums",
                  style: "font-family: var(--font-mono);",
                },
                doses[c] ?? "—",
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

function section(title: string, ...body: (Node | string | undefined | false)[]): HTMLElement {
  return el(
    "section",
    { class: "space-y-2" },
    el(
      "h2",
      { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold" },
      title,
    ),
    ...body.filter((b): b is Node | string => b !== undefined && b !== false),
  );
}

function renderKnown(slug: SubstanceSlug, sub: LeanSubstance): HTMLElement {
  const onset = sub.formatted_onset;
  const duration = sub.formatted_duration;
  const tl = timelineFor(onset, duration);

  const timingRow = el(
    "div",
    { class: "flex flex-wrap gap-4" },
    el(
      "div",
      {},
      el(
        "p",
        { class: "text-xs text-[var(--color-fg-muted)]" },
        onset?.route ? `Onset (${onset.route.toLowerCase()})` : "Onset",
      ),
      el(
        "p",
        { class: "text-base font-medium text-[var(--color-fg-primary)]" },
        tl.onset ? formatRange(tl.onset) : "—",
      ),
    ),
    el(
      "div",
      {},
      el("p", { class: "text-xs text-[var(--color-fg-muted)]" }, "Duration"),
      el(
        "p",
        { class: "text-base font-medium text-[var(--color-fg-primary)]" },
        tl.total ? formatRange(tl.total) : "—",
      ),
    ),
  );

  const dose = doseTable(sub.formatted_dose);

  return el(
    "article",
    { class: "space-y-5" },
    el(
      "header",
      { class: "space-y-3" },
      el(
        "a",
        {
          href: "#/",
          class: "inline-block text-sm font-medium text-[var(--color-sev-caution)]",
        },
        "← Back to combo planner",
      ),
      el(
        "h1",
        { class: "text-3xl font-semibold text-[var(--color-fg-primary)]" },
        sub.pretty_name,
      ),
      categoryBadges(sub.categories),
    ),
    sub.summary
      ? section(
          "Summary",
          el(
            "p",
            {
              class: "text-base text-[var(--color-fg-primary)] leading-relaxed",
              style: "font-family: var(--font-serif);",
            },
            sub.summary,
          ),
        )
      : undefined,
    section("Timing", timingRow),
    dose ? section("Dose", dose, sub.dose_note ? el("p", { class: "text-xs italic text-[var(--color-fg-muted)] mt-2" }, sub.dose_note.trim()) : undefined) : undefined,
    sub.general_advice
      ? section(
          "Harm-reduction advice",
          el(
            "p",
            { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
            sub.general_advice.trim(),
          ),
        )
      : undefined,
    sub.aliases.length > 0
      ? section(
          "Also known as",
          el("p", { class: "text-sm text-[var(--color-fg-muted)]" }, sub.aliases.join(" · ")),
        )
      : undefined,
    el(
      "section",
      { class: "pt-4 border-t border-[var(--color-border)] space-y-2" },
      el(
        "p",
        { class: "text-xs italic text-[var(--color-fg-muted)]" },
        "Dose, timing, and summary data from the TripSit dataset. partysafe shows a subset for quick reference; full factsheets, references, and detection windows live upstream.",
      ),
      el(
        "a",
        {
          href: `https://drugs.tripsit.me/${encodeURIComponent(slug)}`,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "inline-block text-sm font-medium text-[var(--color-sev-caution)] underline",
        },
        `Full ${sub.pretty_name} factsheet on TripSit →`,
      ),
    ),
  );
}

function renderUnknown(slug: SubstanceSlug): HTMLElement {
  return el(
    "article",
    { class: "space-y-4" },
    el(
      "a",
      { href: "#/", class: "inline-block text-sm font-medium text-[var(--color-sev-caution)]" },
      "← Back to combo planner",
    ),
    el("h1", { class: "text-2xl font-semibold text-[var(--color-fg-primary)]" }, "Substance not found"),
    el(
      "p",
      { class: "text-base text-[var(--color-fg-muted)]" },
      `No factsheet for "${slug}". It may not be in the TripSit dataset, or the link may be mistyped.`,
    ),
    el(
      "a",
      {
        href: `https://psychonautwiki.org/wiki/Special:Search?search=${encodeURIComponent(slug)}`,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "inline-block text-sm font-medium text-[var(--color-sev-caution)] underline",
      },
      `Search PsychonautWiki for "${slug}" →`,
    ),
  );
}

export function renderDrugDetail(slug: SubstanceSlug, dataset: LeanDataset | undefined): HTMLElement {
  const sub = dataset?.[slug];
  if (!sub) return renderUnknown(slug);
  return renderKnown(slug, sub);
}
