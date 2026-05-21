/**
 * TopBar — brand + menu button. Emergency intentionally lives in the sticky
 * EmergencyActionBar (Design C2), NOT here.
 */
import { el } from "../lib/dom.ts";

export function createTopBar(): HTMLElement {
  return el(
    "div",
    {
      class:
        "flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]",
    },
    el(
      "a",
      {
        href: "#/",
        class: "brand text-xl no-underline",
        "aria-label": "partysafe — home",
      },
      "partysafe",
    ),
    el(
      "button",
      {
        type: "button",
        class:
          "menu inline-flex items-center justify-center min-h-touch min-w-touch text-sm text-[var(--color-fg-muted)]",
        "aria-label": "Menu",
      },
      "☰",
    ),
  );
}
