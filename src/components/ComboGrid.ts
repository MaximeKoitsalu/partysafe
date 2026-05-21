/**
 * ComboGrid — pairwise risk tiles.
 *
 * Locked spec (PLAN.md Design D5):
 *   - One tile per pair, 56px+ tall, severity stripe on left, 1-line summary,
 *     chevron-right, qualifier inline (always — never collapsed).
 *   - On tap: opens the bottom sheet mechanism explainer (M3 wires the sheet).
 *     For M2 we render tiles + emit a custom event "tile-click" with the pair
 *     payload; main.ts will be the eventual sheet host.
 *   - When the parent (ComboBanner) is in cumulative-warning mode, the grid
 *     renders the tiles behind a "Show pairwise estimates ▼" reveal — that
 *     toggle is owned here.
 *   - Pairs are sorted by severity descending (Design / CEO #11) so the most
 *     dangerous interaction is read first.
 */

import { el, replace } from "../lib/dom.ts";
import { revealStagger } from "../lib/anim.ts";
import { SEVERITY_ORDER, tokenFor } from "../lib/severity.ts";
import type { ComboAnalysis, LeanDataset, PairwiseRisk } from "../types.ts";

export type ComboGridHandle = {
  element: HTMLElement;
  update(analysis: ComboAnalysis | undefined, dataset: LeanDataset | undefined): void;
};

export type ComboGridOptions = {
  onTileClick?: (pair: PairwiseRisk) => void;
};

function prettyOf(dataset: LeanDataset | undefined, slug: string): string {
  return dataset?.[slug]?.pretty_name ?? slug;
}

function sortPairs(pairs: PairwiseRisk[]): PairwiseRisk[] {
  return [...pairs].sort((a, b) => {
    const sa = a.severity ? SEVERITY_ORDER[a.severity] : -1;
    const sb = b.severity ? SEVERITY_ORDER[b.severity] : -1;
    return sb - sa;
  });
}

function tile(
  pair: PairwiseRisk,
  dataset: LeanDataset | undefined,
  onClick: ((p: PairwiseRisk) => void) | undefined,
): HTMLElement {
  const a = prettyOf(dataset, pair.a);
  const b = prettyOf(dataset, pair.b);
  const sev = pair.severity;
  const t = sev ? tokenFor(sev) : undefined;
  const accent = t ? `var(${t.cssVar})` : "var(--color-border)";
  const summary =
    pair.mechanism?.locales.en?.mechanism_prose?.split(/(?<=[.!?])\s+/)[0] ??
    (pair.upstream_note ? pair.upstream_note.split(/(?<=[.!?])\s+/)[0] : undefined) ??
    "No combo data available for this pair.";

  const tileEl = el(
    "button",
    {
      type: "button",
      class:
        "w-full text-left rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 flex items-start gap-3 transition-colors hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
      style: `border-left: 4px solid ${accent};`,
      "aria-label": `${a} + ${b}${t ? `: ${t.label}` : ""}. Tap for mechanism details.`,
    },
    el(
      "div",
      { class: "flex-1 min-w-0 space-y-1.5" },
      el(
        "div",
        { class: "flex items-center justify-between gap-3" },
        el(
          "h3",
          { class: "text-base font-semibold text-[var(--color-fg-primary)]" },
          `${a} + ${b}`,
          pair.mechanism?.common_name
            ? el(
                "span",
                {
                  class:
                    "ml-2 align-middle text-xs font-medium rounded-full px-2 py-0.5 bg-[var(--color-bg-overlay)] text-[var(--color-fg-muted)]",
                },
                pair.mechanism.common_name,
              )
            : undefined,
        ),
        t
          ? el(
              "span",
              {
                class:
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium shrink-0",
                style: `color: var(${t.cssVar}); background: color-mix(in srgb, var(${t.cssVar}) 18%, transparent);`,
              },
              el("span", { "aria-hidden": "true" }, t.icon),
              t.label,
            )
          : undefined,
      ),
      el(
        "p",
        { class: "text-sm text-[var(--color-fg-primary)] line-clamp-2" },
        summary,
      ),
      // Mandatory qualifier baked into every tile (Design D11).
      el(
        "p",
        { class: "text-xs italic text-[var(--color-fg-muted)]" },
        t
          ? t.qualifier
          : "Treat any combo as elevated risk by default. See per-substance pages for context.",
      ),
      // Override / disputed annotation (Design D19).
      pair.override
        ? el(
            "p",
            {
              class:
                "inline-flex items-center gap-1 rounded-md bg-[var(--color-bg-overlay)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-fg-primary)]",
            },
            "📌",
            pair.override.label ?? "reviewed",
          )
        : undefined,
    ),
    el(
      "span",
      {
        class: "text-[var(--color-fg-muted)] text-xl shrink-0 self-center",
        "aria-hidden": "true",
      },
      "›",
    ),
  );

  if (onClick) {
    tileEl.addEventListener("click", () => onClick(pair));
  }

  return tileEl;
}

export function createComboGrid(options: ComboGridOptions = {}): ComboGridHandle {
  const wrap = el("section", {
    class: "space-y-3",
    role: "region",
    "aria-label": "Pairwise interactions",
  });

  // State for the cumulative-warning reveal: collapsed by default when 3+.
  let pairwiseRevealed = false;

  function renderTiles(pairs: PairwiseRisk[], dataset: LeanDataset | undefined): HTMLElement {
    if (pairs.length === 0) return el("div");
    const sorted = sortPairs(pairs);
    return el(
      "div",
      { class: "space-y-2", role: "list" },
      el(
        "h3",
        { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)]" },
        "How they interact",
      ),
      ...sorted.map((p) => tile(p, dataset, options.onTileClick)),
    );
  }

  function update(analysis: ComboAnalysis | undefined, dataset: LeanDataset | undefined): void {
    if (!analysis || analysis.pairs.length === 0) {
      replace(wrap);
      return;
    }
    if (analysis.cumulative_warning && !pairwiseRevealed) {
      replace(
        wrap,
        el(
          "button",
          {
            type: "button",
            class:
              "w-full rounded-lg border border-dashed border-[var(--color-border)] bg-transparent p-4 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] focus-visible:bg-[var(--color-bg-elevated)] motion-reduce:transition-none",
            "aria-expanded": "false",
            "data-action": "reveal-pairwise",
          },
          `Show pairwise estimates (${analysis.pairs.length}) ▼`,
        ),
      );
      return;
    }
    replace(
      wrap,
      analysis.cumulative_warning
        ? el(
            "div",
            { class: "flex items-center justify-between gap-2" },
            el(
              "p",
              { class: "text-xs text-[var(--color-fg-muted)]" },
              "Pairwise estimates only — cumulative effects not modeled.",
            ),
            el(
              "button",
              {
                type: "button",
                class:
                  "text-xs underline text-[var(--color-fg-muted)] motion-reduce:transition-none",
                "data-action": "hide-pairwise",
              },
              "Hide",
            ),
          )
        : undefined,
      renderTiles(analysis.pairs, dataset),
    );
    // Stagger the freshly-rendered tiles in (no-op under reduced motion).
    revealStagger(wrap.querySelectorAll('[aria-label*="Tap for mechanism"]'), {
      staggerMs: 60,
      durationMs: 420,
    });
  }

  wrap.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const action = target?.closest("[data-action]")?.getAttribute("data-action");
    if (action === "reveal-pairwise") {
      pairwiseRevealed = true;
      wrap.dispatchEvent(new CustomEvent("reveal-pairwise"));
    } else if (action === "hide-pairwise") {
      pairwiseRevealed = false;
      wrap.dispatchEvent(new CustomEvent("hide-pairwise"));
    }
  });

  return { element: wrap, update };
}
