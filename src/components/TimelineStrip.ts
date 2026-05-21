/**
 * TimelineStrip — onset / peak / comedown bars on a shared x-axis.
 *
 * Locked spec (PLAN.md Design M3):
 *   - Horizontal segmented bars, one per substance, stacked vertically.
 *   - Each bar: onset (lighter, faded edge in) → peak (full saturation) →
 *     comedown (lighter, faded edge out).
 *   - Shared x-axis across all substances (0 → max total duration).
 *   - Substance labels at left; time markers along the top.
 *   - Degrades gracefully when onset is missing (renders duration bar only).
 *   - Static layout — no animation, so reduced-motion is a non-issue, but the
 *     container still avoids transitions for consistency.
 *
 * The axis max is the largest `total.max` across selected substances, rounded
 * up to a friendly hour boundary so the gridlines read cleanly.
 */

import { el } from "../lib/dom.ts";
import { formatRange, timelineFor, type TimelineSegments } from "../lib/timeline.ts";
import type { LeanDataset, SubstanceSlug } from "../types.ts";

export type TimelineStripHandle = {
  element: HTMLElement;
  update(selection: SubstanceSlug[], dataset: LeanDataset | undefined): void;
};

type Row = {
  slug: SubstanceSlug;
  pretty: string;
  segments: TimelineSegments;
  /** Route the onset reflects, when it came from a route-specific field. */
  onsetRoute?: string;
};

/** Round minutes up to a friendly axis boundary (30m / 1h / 2h steps). */
function axisMax(minutesMax: number): number {
  if (minutesMax <= 60) return 60;
  if (minutesMax <= 120) return 120;
  if (minutesMax <= 240) return Math.ceil(minutesMax / 60) * 60;
  return Math.ceil(minutesMax / 120) * 120;
}

function axisTicks(maxMin: number): number[] {
  const step = maxMin <= 120 ? 30 : maxMin <= 360 ? 60 : 120;
  const ticks: number[] = [];
  for (let t = 0; t <= maxMin; t += step) ticks.push(t);
  return ticks;
}

function tickLabel(min: number): string {
  if (min === 0) return "0";
  if (min < 60) return `${min}m`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

function pct(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / max) * 100));
}

// Neon timeline hues — one per substance row so stacked bars stay distinct.
// Deliberately COOL/electric (cyan, magenta, purple, teal): never amber/orange/
// red, so a timeline bar is never mistaken for a severity readout.
const NEON_BARS = ["#2ee6ff", "#ff3d9a", "#b06bff", "#2bffc6"] as const;

export function createTimelineStrip(): TimelineStripHandle {
  const wrap = el("section", {
    class: "space-y-3",
    role: "region",
    "aria-label": "Onset and duration timeline",
  });

  function update(selection: SubstanceSlug[], dataset: LeanDataset | undefined): void {
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    if (!dataset || selection.length === 0) return;

    const rows: Row[] = [];
    for (const slug of selection) {
      const sub = dataset[slug];
      if (!sub) continue;
      const segments = timelineFor(sub.formatted_onset, sub.formatted_duration);
      if (!segments.onset && !segments.total) continue; // no timing data at all
      rows.push({
        slug,
        pretty: sub.pretty_name,
        segments,
        ...(sub.formatted_onset?.route && { onsetRoute: sub.formatted_onset.route }),
      });
    }
    if (rows.length === 0) return;

    const maxMin = axisMax(
      Math.max(...rows.map((r) => r.segments.total?.max ?? r.segments.onset?.max ?? 60)),
    );
    const ticks = axisTicks(maxMin);

    wrap.appendChild(
      el(
        "h3",
        { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)]" },
        "Timeline (typical, from dose)",
      ),
    );

    const chart = el("div", {
      class: "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4",
    });

    // X-axis tick labels
    const axis = el(
      "div",
      { class: "relative h-4 ml-24 mb-1", "aria-hidden": "true" },
      ...ticks.map((t) =>
        el(
          "span",
          {
            class: "absolute text-[10px] text-[var(--color-fg-muted)] -translate-x-1/2",
            style: `left:${pct(t, maxMin)}%;`,
          },
          tickLabel(t),
        ),
      ),
    );
    chart.appendChild(axis);

    rows.forEach((row, i) => {
      const { onset, total, peak_estimate } = row.segments;
      const hue = NEON_BARS[i % NEON_BARS.length] as string;
      const segs: HTMLElement[] = [];

      if (!onset) {
        // No onset data: don't fabricate a peak. Render a single uniform bar
        // across the known duration so we don't imply a fast/instant come-up.
        const end = total?.max ?? 0;
        if (end > 0) {
          segs.push(
            el("span", {
              class: "absolute top-0 bottom-0 rounded",
              style: `left:0;width:${pct(end, maxMin)}%;background:color-mix(in srgb, ${hue} 48%, transparent);`,
              title: total ? `duration ${formatRange(total)} · onset data not available` : "duration",
            }),
          );
        }
      } else {
        // onset (faded, coming up) → peak (solid + glow) → comedown (faded).
        const onsetEnd = onset.max;
        const peakEnd = peak_estimate?.max ?? total?.min ?? onsetEnd;
        const totalEnd = total?.max ?? peakEnd;
        const routeNote = row.onsetRoute ? ` (${row.onsetRoute.toLowerCase()})` : "";

        if (onsetEnd > 0) {
          segs.push(
            el("span", {
              class: "absolute top-0 bottom-0 rounded-l",
              style: `left:0;width:${pct(onsetEnd, maxMin)}%;background:color-mix(in srgb, ${hue} 32%, transparent);`,
              title: `onset ${formatRange(onset)}${routeNote}`,
            }),
          );
        }
        if (peakEnd > onsetEnd) {
          segs.push(
            el("span", {
              class: "absolute top-0 bottom-0",
              style: `left:${pct(onsetEnd, maxMin)}%;width:${pct(peakEnd - onsetEnd, maxMin)}%;background:${hue};box-shadow:0 0 10px -1px ${hue};`,
              title: "peak",
            }),
          );
        }
        if (totalEnd > peakEnd) {
          segs.push(
            el("span", {
              class: "absolute top-0 bottom-0 rounded-r",
              style: `left:${pct(peakEnd, maxMin)}%;width:${pct(totalEnd - peakEnd, maxMin)}%;background:color-mix(in srgb, ${hue} 32%, transparent);`,
              title: total ? `total ${formatRange(total)}` : "duration",
            }),
          );
        }
      }

      const routeSuffix = row.onsetRoute ? ` · onset via ${row.onsetRoute.toLowerCase()}` : "";
      const durationLabel =
        (total ? formatRange(total) : onset ? `onset ${formatRange(onset)}` : "—") + routeSuffix;

      chart.appendChild(
        el(
          "div",
          { class: "flex items-center gap-2 py-1.5" },
          el(
            "a",
            {
              href: `#/drug/${row.slug}`,
              class:
                "w-24 shrink-0 text-sm font-medium text-[var(--color-fg-primary)] truncate underline-offset-2 hover:underline",
              title: `${row.pretty} — ${durationLabel}`,
            },
            row.pretty,
          ),
          el(
            "div",
            {
              class: "relative flex-1 h-5 rounded bg-[var(--color-bg-overlay)]",
              role: "img",
              "aria-label": `${row.pretty}: ${durationLabel}`,
            },
            ...segs,
          ),
        ),
      );
    });

    chart.appendChild(
      el(
        "p",
        { class: "mt-3 text-[11px] italic text-[var(--color-fg-muted)]" },
        "Bars show typical onset (faded), peak (solid), and comedown (faded). Onset is highly route-dependent — snorted or vaped hits much faster than swallowed — so it's shown for one common route (hover a bar for which). Timing also varies with dose, body, and tolerance; some substances have no onset data.",
      ),
    );

    wrap.appendChild(chart);
  }

  return { element: wrap, update };
}
