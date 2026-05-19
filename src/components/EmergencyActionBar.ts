/**
 * EmergencyActionBar — sticky bottom 64px bar with two 50/50 buttons.
 *
 * Locked spec (PLAN.md Design C2 + D8):
 *   - position: fixed; bottom: 0
 *   - 64px tall, full-width, two buttons
 *   - Left: opens /emergency (full-screen panel; lands in M5)
 *   - Right: region-detected `tel:` link via navigator.language (D23)
 *   - Background neutral-dark, NOT severity-red (desensitization risk)
 *
 * Body padding-bottom: 4rem is reserved in tailwind.css so scrolled content
 * never disappears under this bar.
 */

import { el } from "../lib/dom.ts";
import { resolveHotlines } from "../lib/emergency.ts";

export function createEmergencyActionBar(lang: string | undefined): HTMLElement {
  const { primary } = resolveHotlines(lang);

  return el(
    "div",
    {
      class:
        "fixed bottom-0 inset-x-0 z-50 flex border-t border-[var(--color-border)] bg-[var(--color-emergency-bar)]",
      style: "height: 4rem;",
      role: "toolbar",
      "aria-label": "Emergency actions",
    },
    el(
      "a",
      {
        href: "#/emergency",
        class:
          "flex-1 inline-flex items-center justify-center gap-2 text-[var(--color-emergency-fg)] font-medium hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none no-underline",
        "aria-label": "Open emergency information panel",
      },
      el(
        "span",
        { "aria-hidden": "true", style: "color: var(--color-emergency-icon);" },
        "⚠",
      ),
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
