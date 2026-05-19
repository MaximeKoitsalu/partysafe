/**
 * SeverityChip — the locked severity rendering.
 *
 * Invariant (PLAN.md Design D2 / D10 / D11, Eng E29):
 *   Every chip renders color + icon + qualifier text. Always together.
 *   Dangerous gets a pattern overlay so it survives B&W + color-blind.
 *
 * Two variants:
 *   chip()         — small inline pill (~32px tall)
 *   bannerChip()   — large variant for the worst-case banner header
 *
 * The "Reported Synergy" rename (was "Low Risk & Synergy") is enforced via
 * SEVERITY_TOKENS in lib/severity.ts — this component is just the renderer.
 */

import { el } from "../lib/dom.ts";
import { tokenFor, type Severity } from "../lib/severity.ts";

export type ChipSize = "sm" | "md" | "lg";

export type ChipOptions = {
  size?: ChipSize;
  /** When true, omits the qualifier text (used inside dense pairwise tiles
   *  where qualifier renders in a sibling element instead). The chip itself
   *  still pairs color+icon — qualifier is just spatially relocated. */
  inlineQualifier?: boolean;
};

const SIZE_CLASSES: Record<ChipSize, string> = {
  sm: "px-2 py-1 text-xs gap-1.5",
  md: "px-3 py-1.5 text-sm gap-2",
  lg: "px-4 py-2 text-base gap-2.5",
};

/**
 * Build the chip element for a given severity.
 *
 * Styling: foreground color uses the severity CSS var; background is the
 * severity color at 20% opacity via color-mix; left border is the full-
 * saturation severity color. Dangerous additionally renders a `<span>`
 * with the diagonal-stripe pattern class so color-blind users see the
 * difference even at 100% saturation.
 */
export function chip(severity: Severity, options: ChipOptions = {}): HTMLElement {
  const t = tokenFor(severity);
  const size = options.size ?? "sm";
  const sizeClasses = SIZE_CLASSES[size];

  const bgMix = `color-mix(in srgb, var(${t.cssVar}) 18%, transparent)`;
  const fg = `var(${t.cssVar})`;

  const wrap = el(
    "span",
    {
      class: `inline-flex items-center rounded-md font-medium ${sizeClasses}`,
      style: `background:${bgMix};color:${fg};border-left:4px solid var(${t.cssVar});`,
      role: "img",
      "aria-label": `${t.label}: ${t.qualifier}`,
    },
    el("span", { "aria-hidden": "true", class: "shrink-0" }, t.icon),
    el("span", { class: "shrink-0" }, t.label),
  );

  if (t.pattern) {
    // Dangerous: diagonal-stripe band on the right side so screenshot-cropped
    // tiles still surface the visual difference between Dangerous and Caution.
    const stripe = el("span", {
      class: "pattern-danger-stripes ml-1 inline-block rounded-sm",
      style: "width: 14px; height: 14px;",
      "aria-hidden": "true",
    });
    wrap.appendChild(stripe);
  }

  if (!options.inlineQualifier) {
    const note = el(
      "span",
      {
        class: "ml-2 text-[11px] font-normal italic opacity-80",
        style: `color:${fg};`,
      },
      t.qualifier,
    );
    wrap.appendChild(note);
  }

  return wrap;
}

/**
 * Larger banner-style chip — used by ComboBanner to render the worst-case
 * headline. Qualifier renders below (handled by ComboBanner) so we pass
 * `inlineQualifier: true` here.
 */
export function bannerChip(severity: Severity): HTMLElement {
  return chip(severity, { size: "lg", inlineQualifier: true });
}

/** Convenience: render the qualifier text by itself, for placement near a chip. */
export function qualifierFor(severity: Severity): HTMLElement {
  const t = tokenFor(severity);
  return el(
    "p",
    {
      class: "mt-1 text-xs italic text-[var(--color-fg-muted)]",
    },
    t.qualifier,
  );
}
