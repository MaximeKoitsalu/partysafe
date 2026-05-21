/**
 * Onset / peak / duration string parsing.
 *
 * TripSit's lean dataset gives us:
 *   formatted_onset:    { unit: "minutes", value: "20-70" }
 *   formatted_duration: { unit: "hours",   value: "3-5"  }
 *
 * We parse to typed Range<number> in MINUTES (a single unit makes timeline-
 * strip rendering arithmetic clean). TripSit notes "value" can be:
 *   "20-70"         range
 *   "20"            single
 *   "~2" or "~2-3"  approximate
 *   "1-2 hours"     unit baked in
 */

export type Range = { min: number; max: number };

const UNIT_MIN: Record<string, number> = {
  minute: 1,
  minutes: 1,
  min: 1,
  hour: 60,
  hours: 60,
  hr: 60,
  hrs: 60,
  h: 60,
  day: 24 * 60,
  days: 24 * 60,
  second: 1 / 60,
  seconds: 1 / 60,
  sec: 1 / 60,
};

function unitToMinutes(unit: string): number {
  return UNIT_MIN[unit.toLowerCase()] ?? 1;
}

/**
 * Parse a TripSit value+unit pair into a minute-denominated range.
 * Returns undefined if the value is unparseable.
 */
export function parseRange(value: string | undefined, unit: string | undefined): Range | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/~|approximately/gi, "").trim();
  if (!cleaned) return undefined;

  // Pull unit from inline (e.g. "1-2 hours") if not provided.
  const inlineUnit = cleaned.match(/[A-Za-z]+$/);
  const unitStr = unit ?? inlineUnit?.[0] ?? "minutes";
  const numericPart = inlineUnit ? cleaned.slice(0, inlineUnit.index).trim() : cleaned;

  const factor = unitToMinutes(unitStr);
  const range = numericPart.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range && range[1] && range[2]) {
    const min = parseFloat(range[1]) * factor;
    const max = parseFloat(range[2]) * factor;
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : undefined;
  }
  const single = numericPart.match(/^(\d+(?:\.\d+)?)$/);
  if (single && single[1]) {
    const v = parseFloat(single[1]) * factor;
    return Number.isFinite(v) ? { min: v, max: v } : undefined;
  }
  return undefined;
}

/**
 * Onset, peak window, and total duration as bar segments for a substance.
 * "peak" is approximated as the second half of the onset range to the start
 * of the comedown (or until duration end if no separate peak data exists in
 * TripSit). Substantially better data lands in M4 with per-substance peak
 * times from PsychonautWiki / Erowid reference content.
 */
export type TimelineSegments = {
  onset?: Range;
  total?: Range;
  /** Convenience: onset midpoint + duration midpoint = approximate peak start. */
  peak_estimate?: Range;
};

export function timelineFor(
  formatted_onset?: { unit: string; value: string },
  formatted_duration?: { unit: string; value: string },
): TimelineSegments {
  const onset = parseRange(formatted_onset?.value, formatted_onset?.unit);
  const total = parseRange(formatted_duration?.value, formatted_duration?.unit);
  if (!onset || !total) return { ...(onset && { onset }), ...(total && { total }) };
  // Peak estimate: starts halfway through onset, ends at 60% of total duration.
  const peak_estimate: Range = {
    min: (onset.min + onset.max) / 2,
    max: total.min + (total.max - total.min) * 0.6,
  };
  return { onset, total, peak_estimate };
}

/** Format a Range into a human-readable string like "20-70 min" or "3-5 hr". */
export function formatRange(r: Range): string {
  const minHrs = r.min / 60;
  const maxHrs = r.max / 60;
  if (minHrs >= 1) {
    const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
    return r.min === r.max ? `${fmt(minHrs)} hr` : `${fmt(minHrs)}-${fmt(maxHrs)} hr`;
  }
  return r.min === r.max ? `${Math.round(r.min)} min` : `${Math.round(r.min)}-${Math.round(r.max)} min`;
}
