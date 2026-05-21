/**
 * DraftNotice — a slim, always-visible strip stating the mechanism content has
 * not yet been clinically reviewed.
 *
 * The site is going public before the clinical-review ship gate is met (an
 * explicit, owner-approved decision). Until a qualified clinician signs off
 * every mechanism entry (enforced by `validate:strict` / `reviewed_by`), users
 * must know the explanations are community-drafted and unverified. This notice
 * is intentionally NOT dismissible — the whole site is in an unreviewed state,
 * not a one-time message. Remove this component when clinical review lands.
 */

import { el } from "../lib/dom.ts";

export function createDraftNotice(): HTMLElement {
  return el(
    "div",
    {
      class:
        "px-4 py-1.5 text-center text-xs leading-snug bg-[color-mix(in_srgb,var(--color-sev-caution)_22%,var(--color-bg-base))] text-[var(--color-fg-primary)] border-b border-[var(--color-border)]",
      role: "note",
      "aria-label": "Draft content notice",
    },
    el("span", { "aria-hidden": "true" }, "⚠ "),
    "Draft: these explanations are community-written and ",
    el("strong", {}, "not yet reviewed by a clinician"),
    ". Cross-check anything important. ",
    el(
      "a",
      { href: "#/about", class: "underline whitespace-nowrap" },
      "Why?",
    ),
  );
}
