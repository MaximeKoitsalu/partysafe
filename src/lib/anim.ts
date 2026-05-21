/**
 * Motion layer — anime.js v4, wrapped behind a reduced-motion guard.
 *
 * Principles for a harm-reduction app:
 * - `prefers-reduced-motion: reduce` → every wrapper is a no-op and content is
 *   left fully visible (no opacity:0 left behind). Accessibility first.
 * - GPU-friendly only: opacity + transform (translate/scale). No layout props.
 * - Entrance reveals are FAST (≤ ~450ms) and never delay safety content — the
 *   worst-case banner uses a quick, sober fade (no bouncy overshoot); the showy
 *   springs are reserved for non-severity chrome (quick-pick, brand, sun).
 * - Animations set their start value synchronously, so there's no flash of
 *   un-positioned content.
 */

import { animate, stagger } from "animejs";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    // Read fresh each call so a mid-session OS setting change is respected.
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type Targets = Element | Element[] | NodeListOf<Element> | null | undefined;

function toArray(targets: Targets): Element[] {
  if (!targets) return [];
  // `Element` may be undefined in non-DOM runtimes (tests / SSR).
  if (typeof Element !== "undefined" && targets instanceof Element) return [targets];
  if (Array.isArray(targets)) return targets;
  return Array.from(targets as ArrayLike<Element>);
}

/**
 * Staggered fade + slide-up reveal. For lists of cards/pills/tiles.
 * No-op under reduced motion (elements stay visible).
 */
export function revealStagger(
  targets: Targets,
  opts: { y?: number; delayMs?: number; staggerMs?: number; durationMs?: number } = {},
): void {
  const els = toArray(targets);
  if (els.length === 0 || prefersReducedMotion()) return;
  const { y = 14, delayMs = 0, staggerMs = 55, durationMs = 440 } = opts;
  animate(els, {
    opacity: [0, 1],
    translateY: [y, 0],
    duration: durationMs,
    delay: stagger(staggerMs, { start: delayMs }),
    ease: "out(3)",
  });
}

/**
 * Single sober reveal — quick fade + tiny rise. Used for the worst-case banner
 * so the severity reading is never delayed or made to feel celebratory.
 */
export function revealOne(
  target: Targets,
  opts: { y?: number; durationMs?: number } = {},
): void {
  const els = toArray(target);
  if (els.length === 0 || prefersReducedMotion()) return;
  const { y = 8, durationMs = 280 } = opts;
  animate(els, {
    opacity: [0, 1],
    translateY: [y, 0],
    duration: durationMs,
    ease: "outQuad",
  });
}

/**
 * Springy pop-in (slight overshoot). Decorative chrome only — never severity.
 */
export function popIn(target: Targets, opts: { delayMs?: number } = {}): void {
  const els = toArray(target);
  if (els.length === 0 || prefersReducedMotion()) return;
  animate(els, {
    opacity: [0, 1],
    scale: [0.8, 1],
    duration: 620,
    delay: opts.delayMs ?? 0,
    ease: "outElastic(1, 0.6)",
  });
}
