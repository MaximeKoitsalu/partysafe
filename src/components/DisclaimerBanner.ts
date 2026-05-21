/**
 * DisclaimerBanner — modal interstitial on first picker interaction.
 *
 * Locked spec (PLAN.md Design D9 / H7):
 *   - NOT shown on page load. Shown the first time the user interacts with the
 *     picker (gives the picker time to be visible, less annoying than a load
 *     gate, more legally meaningful than an auto-collapsing banner).
 *   - Region-neutral language ("your local emergency number" — not "911").
 *   - Two buttons: "I understand" (primary) and "Emergency now" (→ /emergency).
 *   - localStorage ack (disclaimer-ack-v1), 90-day re-show via lib/storage.
 *
 * maybeShow() is a no-op if already acknowledged within the TTL.
 */

import { el, replace } from "../lib/dom.ts";
import { acknowledgeDisclaimer, disclaimerAcknowledged } from "../lib/storage.ts";

export type DisclaimerHandle = {
  element: HTMLElement;
  /** Show the modal unless already acknowledged. Returns true if shown. */
  maybeShow(): boolean;
};

export function createDisclaimerBanner(): DisclaimerHandle {
  const root = el("div", { class: "hidden" });

  function close(): void {
    acknowledgeDisclaimer();
    replace(root);
    root.classList.add("hidden");
    document.body.classList.remove("ps-sheet-open");
  }

  function show(): void {
    document.body.classList.add("ps-sheet-open");
    root.classList.remove("hidden");
    const card = el(
      "div",
      {
        class:
          "fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "ps-disclaimer-title",
      },
      el(
        "div",
        {
          class:
            "max-w-md w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4 shadow-2xl",
        },
        el(
          "h2",
          {
            id: "ps-disclaimer-title",
            class: "text-xl font-semibold text-[var(--color-fg-primary)]",
          },
          "Before you continue",
        ),
        el(
          "p",
          { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
          "partysafe is general harm-reduction information, not medical advice. It cannot tell you what is safe — only what is known about how substances interact. Effects vary with dose, body, batch purity, and setting.",
        ),
        el(
          "p",
          { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
          "If someone is in trouble right now, call your local emergency number. Getting help is always the right call — most places have Good Samaritan protections for people who call about an overdose.",
        ),
        el(
          "div",
          { class: "flex flex-col gap-2 pt-2" },
          el(
            "button",
            {
              type: "button",
              class:
                "w-full rounded-lg bg-[var(--color-sev-caution)] px-4 py-3 font-semibold text-black hover:opacity-90 focus-visible:opacity-90 motion-reduce:transition-none",
              "data-action": "ack",
            },
            "I understand",
          ),
          el(
            "a",
            {
              href: "#/emergency",
              class:
                "w-full text-center rounded-lg border border-[var(--color-border)] px-4 py-3 font-medium text-[var(--color-fg-primary)] no-underline hover:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
              "data-action": "emergency",
            },
            "Emergency now",
          ),
        ),
      ),
    );
    replace(root, card);

    card.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      const action = target?.closest("[data-action]")?.getAttribute("data-action");
      if (action === "ack") {
        close();
      } else if (action === "emergency") {
        // Acknowledge (they've seen it) then let the hash navigation proceed.
        acknowledgeDisclaimer();
        replace(root);
        root.classList.add("hidden");
        document.body.classList.remove("ps-sheet-open");
      }
    });

    // First focusable element for keyboard users.
    setTimeout(() => {
      const btn = card.querySelector("[data-action='ack']") as HTMLElement | null;
      btn?.focus();
    }, 50);
  }

  return {
    element: root,
    maybeShow(): boolean {
      if (disclaimerAcknowledged()) return false;
      show();
      return true;
    },
  };
}
