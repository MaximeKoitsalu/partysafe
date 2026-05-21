/**
 * ComboBanner — worst-case header above the pairwise grid.
 *
 * Locked spec (PLAN.md Design D6 + D7):
 *   - Default: 88px tinted band, severity-color left stripe, 24px headline,
 *     16px subhead, 13px italic qualifier "Worst of N pairwise; cumulative
 *     risk not modeled."
 *   - When 3+ substances are selected: the banner is REPLACED by a black
 *     warning bar reading "3+ substances. No model exists for cumulative
 *     interactions. The pairwise estimates below are 2-substance only."
 *     Pairwise tiles in ComboGrid are collapsed behind a "Show pairwise"
 *     reveal, but the reveal is owned there, not here.
 *   - Banner is NOT sticky — the EmergencyActionBar is the only sticky surface.
 */

import { el, replace } from "../lib/dom.ts";
import { popIn, revealOne } from "../lib/anim.ts";
import { tokenFor } from "../lib/severity.ts";
import type { ComboAnalysis } from "../types.ts";

export type ComboBannerHandle = {
  element: HTMLElement;
  update(analysis: ComboAnalysis | undefined, selectionCount: number): void;
};

export function createComboBanner(): ComboBannerHandle {
  const wrap = el("section", {
    class: "rounded-lg overflow-hidden",
    role: "region",
    "aria-label": "Combo summary",
  });

  function renderEmpty(): void {
    const sun = el("div", { class: "retro-sun shrink-0", "aria-hidden": "true" });
    replace(
      wrap,
      el(
        "div",
        {
          class:
            "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 flex items-center gap-4",
        },
        sun,
        el(
          "div",
          { class: "space-y-1" },
          el(
            "p",
            { class: "text-base font-semibold text-[var(--color-fg-primary)]" },
            "Know before you go.",
          ),
          el(
            "p",
            { class: "text-sm text-[var(--color-fg-muted)]" },
            "Pick 2 or more substances to see how they interact — risks, what to watch for, and what to do if something goes wrong.",
          ),
        ),
      ),
    );
    popIn(sun);
  }

  function renderCumulativeWarning(count: number): void {
    replace(
      wrap,
      el(
        "div",
        {
          class:
            "rounded-lg border-l-4 border-amber-400 bg-black text-white p-4 space-y-2",
          role: "alert",
        },
        el(
          "div",
          { class: "flex items-center gap-3" },
          el(
            "span",
            { class: "text-2xl", "aria-hidden": "true" },
            "◼",
          ),
          el(
            "h2",
            { class: "text-xl font-semibold" },
            `${count} substances — cumulative risk not modeled`,
          ),
        ),
        el(
          "p",
          { class: "text-sm leading-relaxed" },
          "The pairwise estimates below show 2-substance interactions only. Treat any combination of 3 or more substances as elevated risk by default. Real-world cumulative effects (cardiovascular load, serotonergic stacking, respiratory depression) are not pharmacologically modeled here.",
        ),
        el(
          "p",
          { class: "text-xs italic opacity-80" },
          "If something feels wrong, call 911 / 112 — see the emergency bar below.",
        ),
      ),
    );
  }

  function renderWorstCase(analysis: ComboAnalysis): void {
    if (!analysis.worst_case) {
      // We have pairs but none had upstream severity data.
      replace(
        wrap,
        el(
          "div",
          {
            class:
              "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-sm text-[var(--color-fg-muted)]",
            role: "status",
          },
          el(
            "p",
            { class: "font-medium text-[var(--color-fg-primary)]" },
            "No combo data available for these substances.",
          ),
          el(
            "p",
            { class: "mt-1" },
            "TripSit's dataset only covers combos between 21 charted substances. Try selecting from MDMA, ketamine, alcohol, ketamine, LSD, cannabis, etc.",
          ),
        ),
      );
      return;
    }

    const sev = analysis.worst_case;
    const t = tokenFor(sev);
    const pairCount = analysis.pairs.length;

    replace(
      wrap,
      el(
        "div",
        {
          class:
            "rounded-lg border border-[var(--color-border)] p-4 space-y-1",
          style: `background: color-mix(in srgb, var(${t.cssVar}) 18%, var(--color-bg-elevated)); border-left: 4px solid var(${t.cssVar});`,
          role: "region",
          "aria-label": `Worst-case severity: ${t.label}`,
        },
        el(
          "div",
          { class: "flex items-center gap-3" },
          el(
            "span",
            {
              class: "text-3xl shrink-0",
              "aria-hidden": "true",
              style: `color: var(${t.cssVar});`,
            },
            t.icon,
          ),
          el(
            "div",
            { class: "flex-1 min-w-0" },
            el(
              "p",
              {
                class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)]",
              },
              "Worst case",
            ),
            el(
              "h2",
              { class: "text-2xl font-semibold text-[var(--color-fg-primary)] leading-tight" },
              t.label,
            ),
          ),
        ),
        el(
          "p",
          { class: "text-sm text-[var(--color-fg-primary)] mt-2" },
          t.qualifier,
        ),
        el(
          "p",
          { class: "text-xs italic text-[var(--color-fg-muted)]" },
          `Worst of ${pairCount} pairwise interaction${pairCount === 1 ? "" : "s"}. Cumulative effects beyond pairwise are not modeled.`,
        ),
      ),
    );
    // Quick, sober reveal — never a celebratory bounce on a severity readout.
    revealOne(wrap.firstElementChild);
  }

  function update(analysis: ComboAnalysis | undefined, selectionCount: number): void {
    if (!analysis || analysis.pairs.length === 0) {
      renderEmpty();
      return;
    }
    if (selectionCount >= 3) {
      renderCumulativeWarning(selectionCount);
      return;
    }
    renderWorstCase(analysis);
  }

  renderEmpty();

  return { element: wrap, update };
}
