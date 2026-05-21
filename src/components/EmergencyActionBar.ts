/**
 * EmergencyActionBar — sticky bottom 64px bar with two 50/50 buttons.
 *
 * Locked spec (PLAN.md Design C2 + D8):
 *   - position: fixed; bottom: 0
 *   - 64px tall, full-width, two buttons
 *   - Left: opens /emergency (full-screen panel)
 *   - Right: region-aware `tel:` link (NOT hardcoded 911 — see lib/emergency.ts)
 *   - Background neutral-dark, NOT severity-red (desensitization risk)
 *
 * The right button's number reflects the active region (override or detected,
 * universal 112 fallback). refresh() re-reads the region so a change made in
 * the EmergencyView picker updates the bar immediately.
 */

import { el, replace } from "../lib/dom.ts";
import { resolveHotlines } from "../lib/emergency.ts";

export type EmergencyActionBarHandle = {
  element: HTMLElement;
  refresh(): void;
};

export function createEmergencyActionBar(lang: string | undefined): EmergencyActionBarHandle {
  const bar = el("div", {
    class:
      "sticky-emergency-bar fixed bottom-0 inset-x-0 z-50 flex border-t border-[var(--color-border)] bg-[var(--color-emergency-bar)]",
    // Neon edge rising from the bar — vaporwave glow, still legible (Design C2).
    style:
      "height: 4rem; box-shadow: 0 -1px 0 0 rgba(46,230,255,0.45), 0 -10px 28px -10px rgba(255,61,154,0.4);",
    role: "toolbar",
    "aria-label": "Emergency actions",
  });

  function render(): void {
    const { primary } = resolveHotlines(lang);
    replace(
      bar,
      el(
        "a",
        {
          href: "#/emergency",
          class:
            "flex-1 inline-flex items-center justify-center gap-2 text-[var(--color-emergency-fg)] font-medium hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none no-underline",
          "aria-label": "Open emergency information panel",
        },
        el("span", { "aria-hidden": "true", style: "color: var(--color-emergency-icon);" }, "⚠"),
        el("span", {}, "Emergency"),
      ),
      el(
        "a",
        {
          href: `tel:${primary.tel}`,
          class:
            "flex-1 inline-flex items-center justify-center gap-2 border-l border-[var(--color-border)] text-[var(--color-emergency-fg)] font-medium hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none no-underline",
          "aria-label": `Call emergency services: ${primary.label}`,
        },
        el("span", { "aria-hidden": "true" }, "📞"),
        el("span", {}, primary.label),
      ),
    );
  }

  render();

  return {
    element: bar,
    refresh: render,
  };
}
