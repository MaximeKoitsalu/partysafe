/**
 * EmergencyView — full-screen #/emergency panel.
 *
 * Locked spec (PLAN.md Design C2 emergency UI), de-Americanized:
 *   - Region picker at the top (persists; refreshes the action bar).
 *   - Primary CALL [region number] button — region-aware, NOT hardcoded 911.
 *   - Region-specific support lines (only the active region's; never US-only
 *     defaults to non-US visitors).
 *   - Universal 112 note (works on most phones worldwide).
 *   - Signs of overdose.
 *   - Recovery-position SVG + numbered steps.
 *   - Browsable list of other regions' numbers for travelers.
 *
 * Pure render function returning an element + the live region. main.ts passes
 * an onRegionChange callback so the sticky action bar updates in lockstep.
 */

import { el } from "../lib/dom.ts";
import { recoveryPositionFigure } from "./RecoveryPosition.ts";
import {
  ALL_REGIONS,
  primaryHotline,
  REGION_NAMES,
  resolveRegion,
  setRegionOverride,
  supportLinesFor,
  UNIVERSAL_NOTE,
} from "../lib/emergency.ts";
import type { RegionCode } from "../types.ts";

const OVERDOSE_SIGNS = [
  "Slow, shallow, irregular, or stopped breathing",
  "Blue, gray, or pale lips, fingertips, or skin",
  "Cannot be woken by shouting or a firm shoulder squeeze",
  "Gurgling, choking, snoring, or rattling sounds",
  "Limp body, cold or clammy skin",
  "Tiny or unresponsive pupils (opioids); very high temperature (stimulants)",
];

const RECOVERY_STEPS = [
  "Roll them onto their side (either side works; left is traditional).",
  "Bend the top knee forward to stop them rolling onto their face.",
  "Tilt the head back and angle the face slightly down so vomit can drain.",
  "Check the mouth is clear and breathing is unobstructed.",
  "Stay with them. Keep checking breathing.",
  "Call your local emergency number if breathing changes or you cannot wake them.",
];

export type EmergencyViewOptions = {
  lang: string | undefined;
  onRegionChange: (region: RegionCode) => void;
};

function callButton(region: RegionCode): HTMLElement {
  const h = primaryHotline(region);
  return el(
    "a",
    {
      href: `tel:${h.tel}`,
      class:
        "flex items-center justify-center gap-3 w-full rounded-xl bg-[var(--color-sev-dangerous)] px-4 text-white font-semibold no-underline hover:opacity-90 focus-visible:opacity-90 motion-reduce:transition-none",
      style: "min-height: 72px; font-size: 1.25rem;",
      "aria-label": `Call emergency services: ${h.label}`,
    },
    el("span", { "aria-hidden": "true" }, "📞"),
    el("span", {}, `${h.label}${h.description ? ` — ${h.description}` : ""}`),
  );
}

export function renderEmergencyView(options: EmergencyViewOptions): HTMLElement {
  const { region } = resolveRegion(options.lang);

  const root = el("article", { class: "space-y-6 pb-8" });

  // Header
  root.appendChild(
    el(
      "header",
      { class: "flex items-center justify-between gap-3" },
      el("h1", { class: "text-2xl font-semibold text-[var(--color-fg-primary)]" }, "Emergency"),
      el(
        "a",
        { href: "#/", class: "text-sm font-medium text-[var(--color-fg-muted)] no-underline", "aria-label": "Close emergency panel" },
        "✕ Close",
      ),
    ),
  );

  // Region picker
  const select = el(
    "select",
    {
      id: "ps-region-select",
      class:
        "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-base text-[var(--color-fg-primary)]",
      "aria-label": "Your region (sets which emergency number to show)",
    },
    ...ALL_REGIONS.map((r) =>
      el("option", { value: r, ...(r === region && { selected: true }) }, REGION_NAMES[r]),
    ),
  ) as HTMLSelectElement;

  // The CALL button + support block re-renders when the region changes.
  const callMount = el("div", { class: "space-y-3" });
  const supportMount = el("div", { class: "space-y-2" });

  function renderForRegion(r: RegionCode): void {
    while (callMount.firstChild) callMount.removeChild(callMount.firstChild);
    callMount.appendChild(callButton(r));

    while (supportMount.firstChild) supportMount.removeChild(supportMount.firstChild);
    const lines = supportLinesFor(r);
    if (lines.length > 0) {
      supportMount.appendChild(
        el(
          "h2",
          { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold" },
          "Support lines",
        ),
      );
      for (const line of lines) {
        supportMount.appendChild(
          el(
            "a",
            {
              href: `tel:${line.tel}`,
              class:
                "block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 no-underline hover:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
            },
            el(
              "span",
              { class: "flex items-center justify-between gap-2" },
              el("span", { class: "font-medium text-[var(--color-fg-primary)]" }, line.name),
              el("span", { class: "text-sm text-[var(--color-fg-muted)]" }, line.display),
            ),
            line.note
              ? el("span", { class: "block text-xs text-[var(--color-fg-muted)] mt-1" }, line.note)
              : undefined,
          ),
        );
      }
    }
  }

  select.addEventListener("change", () => {
    const next = select.value as RegionCode;
    setRegionOverride(next);
    renderForRegion(next);
    options.onRegionChange(next);
  });

  renderForRegion(region);

  root.appendChild(
    el(
      "section",
      { class: "space-y-3" },
      callMount,
      el(
        "label",
        { class: "block space-y-1", for: "ps-region-select" },
        el("span", { class: "text-xs text-[var(--color-fg-muted)]" }, "Wrong country? Set your region:"),
        select,
      ),
      el(
        "p",
        {
          class: "rounded-lg bg-[var(--color-bg-overlay)] p-3 text-xs text-[var(--color-fg-muted)] leading-relaxed",
        },
        UNIVERSAL_NOTE,
      ),
    ),
  );

  if (supportMount.childNodes.length > 0 || supportLinesFor(region).length > 0) {
    root.appendChild(el("section", { class: "space-y-2" }, supportMount));
  } else {
    root.appendChild(supportMount);
  }

  // Signs of overdose
  root.appendChild(
    el(
      "section",
      { class: "space-y-2" },
      el(
        "h2",
        { class: "text-base font-semibold text-[var(--color-fg-primary)]" },
        "Signs someone needs emergency help",
      ),
      el(
        "ul",
        { class: "list-disc list-outside ml-5 space-y-1 text-base text-[var(--color-fg-primary)]" },
        ...OVERDOSE_SIGNS.map((s) => el("li", {}, s)),
      ),
    ),
  );

  // Recovery position
  root.appendChild(
    el(
      "section",
      { class: "space-y-3" },
      el(
        "h2",
        { class: "text-base font-semibold text-[var(--color-fg-primary)]" },
        "Recovery position",
      ),
      el(
        "p",
        { class: "text-sm text-[var(--color-fg-muted)]" },
        "If someone is breathing but unresponsive or very drowsy, put them on their side so they cannot choke on vomit.",
      ),
      el(
        "div",
        {
          class:
            "flex justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4",
        },
        recoveryPositionFigure(),
      ),
      el(
        "ol",
        { class: "list-decimal list-outside ml-5 space-y-1 text-base text-[var(--color-fg-primary)]" },
        ...RECOVERY_STEPS.map((s) => el("li", {}, s)),
      ),
    ),
  );

  // Other regions (for travelers)
  const otherRegions = ALL_REGIONS.filter((r) => r !== region && r !== "OTHER");
  root.appendChild(
    el(
      "details",
      { class: "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3" },
      el(
        "summary",
        { class: "cursor-pointer text-sm font-medium text-[var(--color-fg-primary)]" },
        "Emergency numbers in other countries",
      ),
      el(
        "ul",
        { class: "mt-2 space-y-1 text-sm text-[var(--color-fg-muted)]" },
        ...otherRegions.map((r) => {
          const h = primaryHotline(r);
          return el(
            "li",
            { class: "flex justify-between gap-3" },
            el("span", {}, REGION_NAMES[r]),
            el("span", { class: "font-medium text-[var(--color-fg-primary)] font-[var(--font-mono)]", style: "font-family: var(--font-mono);" }, h.tel),
          );
        }),
      ),
    ),
  );

  root.appendChild(
    el(
      "a",
      { href: "#/", class: "inline-block text-sm font-medium text-[var(--color-sev-caution)]" },
      "← Back to combo planner",
    ),
  );

  return root;
}
