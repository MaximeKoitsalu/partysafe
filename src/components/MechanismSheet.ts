/**
 * MechanismSheet — bottom sheet for mechanism details.
 *
 * Locked spec (PLAN.md Design D5):
 *   - Bottom sheet rising to 75vh on tap
 *   - 4px × 36px drag handle (visual affordance)
 *   - Translucent scrim that preserves the worst-case banner peek
 *   - Drag-to-dismiss, × button top-right (44px tap target), backdrop tap, Escape
 *   - Severity chip + qualifier (always rendered together)
 *   - Mechanism prose 17px serif (slows the reader for medical content)
 *   - "Watch for" bullet list, "First aid" numbered list
 *   - prefers-reduced-motion: slide → opacity fade
 *
 * Body scroll lock + focus trap while open. Restores focus to the triggering
 * element on close. All content rendered via textContent / el() — no innerHTML.
 */

import { el, replace, trapFocus } from "../lib/dom.ts";
import { tokenFor } from "../lib/severity.ts";
import type { LeanDataset, PairwiseRisk } from "../types.ts";

const SHEET_OPEN_CLASS = "is-open";
const BODY_LOCK_CLASS = "ps-sheet-open";

export type MechanismSheetHandle = {
  element: HTMLElement;
  open(pair: PairwiseRisk, dataset: LeanDataset | undefined): void;
  close(): void;
  isOpen(): boolean;
};

function prettyOf(dataset: LeanDataset | undefined, slug: string): string {
  return dataset?.[slug]?.pretty_name ?? slug;
}

function renderContent(pair: PairwiseRisk, dataset: LeanDataset | undefined): HTMLElement[] {
  const a = prettyOf(dataset, pair.a);
  const b = prettyOf(dataset, pair.b);
  const sev = pair.severity;
  const t = sev ? tokenFor(sev) : undefined;
  const content = pair.mechanism?.locales["en"];

  const sections: HTMLElement[] = [];

  const commonName = pair.mechanism?.common_name;

  // Header: combo title + severity chip + mandatory qualifier (always together)
  sections.push(
    el(
      "header",
      { class: "space-y-2" },
      commonName
        ? el(
            "div",
            { class: "space-y-0.5" },
            el(
              "h2",
              { class: "font-display text-3xl font-extrabold text-[var(--color-fg-primary)] leading-tight tracking-tight" },
              commonName,
            ),
            el(
              "p",
              { class: "text-sm text-[var(--color-fg-muted)]" },
              `${a} + ${b}`,
            ),
          )
        : el(
            "h2",
            { class: "text-2xl font-semibold text-[var(--color-fg-primary)] leading-tight" },
            `${a} + ${b}`,
          ),
      t
        ? el(
            "div",
            { class: "flex items-center gap-2" },
            el(
              "span",
              {
                class: "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium",
                style: `color: var(${t.cssVar}); background: color-mix(in srgb, var(${t.cssVar}) 18%, transparent);`,
              },
              el("span", { "aria-hidden": "true" }, t.icon),
              t.label,
            ),
            pair.override
              ? el(
                  "span",
                  {
                    class:
                      "inline-flex items-center gap-1 rounded-md bg-[var(--color-bg-overlay)] px-2 py-1 text-xs font-medium",
                  },
                  "📌",
                  pair.override.label ?? "reviewed",
                )
              : undefined,
          )
        : undefined,
      t
        ? el(
            "p",
            { class: "text-xs italic text-[var(--color-fg-muted)]" },
            t.qualifier,
          )
        : undefined,
    ),
  );

  if (content) {
    sections.push(
      el(
        "section",
        { class: "space-y-2" },
        el(
          "h3",
          {
            class:
              "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold",
          },
          "What's happening",
        ),
        // Serif body for mechanism prose (Design D1: slows reader for medical content)
        el(
          "p",
          {
            class:
              "text-base text-[var(--color-fg-primary)] leading-relaxed font-[var(--font-serif)]",
            style: "font-family: var(--font-serif);",
          },
          content.mechanism_prose,
        ),
      ),
    );

    sections.push(
      el(
        "section",
        { class: "space-y-2" },
        el(
          "h3",
          {
            class:
              "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold",
          },
          "Watch for",
        ),
        el(
          "ul",
          { class: "list-disc list-outside ml-5 space-y-1 text-base text-[var(--color-fg-primary)]" },
          ...content.warning_signs.map((s) => el("li", {}, s)),
        ),
      ),
    );

    sections.push(
      el(
        "section",
        { class: "space-y-2" },
        el(
          "h3",
          {
            class:
              "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold",
          },
          "First aid",
        ),
        el(
          "ol",
          { class: "list-decimal list-outside ml-5 space-y-1 text-base text-[var(--color-fg-primary)]" },
          ...content.first_aid.map((s) => el("li", {}, s)),
        ),
      ),
    );

    // Sources footer + override popover
    if (pair.mechanism?.sources && pair.mechanism.sources.length > 0) {
      sections.push(
        el(
          "section",
          { class: "space-y-1 pt-2 border-t border-[var(--color-border)]" },
          el(
            "h3",
            { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold" },
            "Sources",
          ),
          el(
            "ul",
            { class: "text-xs text-[var(--color-fg-muted)] space-y-0.5" },
            ...pair.mechanism.sources.map((s) =>
              el(
                "li",
                {},
                el(
                  "a",
                  {
                    href: s.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "underline hover:text-[var(--color-fg-primary)]",
                  },
                  s.source,
                ),
              ),
            ),
          ),
        ),
      );
    }
  } else if (pair.upstream_note) {
    sections.push(
      el(
        "section",
        { class: "space-y-2" },
        el(
          "h3",
          { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold" },
          "From TripSit upstream",
        ),
        el(
          "p",
          {
            class: "text-base text-[var(--color-fg-primary)] leading-relaxed",
            style: "font-family: var(--font-serif);",
          },
          pair.upstream_note,
        ),
        el(
          "p",
          {
            class:
              "rounded-md bg-[var(--color-bg-overlay)] p-3 text-xs italic text-[var(--color-fg-muted)]",
          },
          "partysafe-authored mechanism content for this pair has not been written yet. The above is TripSit's upstream note. Track progress in the project's issue queue.",
        ),
      ),
    );
  } else {
    sections.push(
      el(
        "p",
        { class: "text-sm text-[var(--color-fg-muted)]" },
        "No combo data available for this pair. See per-substance pages on the main TripSit site for context.",
      ),
    );
  }

  // Cross-links to per-substance factsheets (M4 task 3).
  sections.push(
    el(
      "section",
      { class: "flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border)]" },
      el(
        "a",
        {
          href: `#/drug/${pair.a}`,
          class:
            "inline-flex items-center gap-1 rounded-lg bg-[var(--color-bg-overlay)] px-3 py-2 text-sm font-medium text-[var(--color-fg-primary)] no-underline hover:opacity-80",
        },
        `${a} factsheet`,
        el("span", { "aria-hidden": "true" }, "→"),
      ),
      el(
        "a",
        {
          href: `#/drug/${pair.b}`,
          class:
            "inline-flex items-center gap-1 rounded-lg bg-[var(--color-bg-overlay)] px-3 py-2 text-sm font-medium text-[var(--color-fg-primary)] no-underline hover:opacity-80",
        },
        `${b} factsheet`,
        el("span", { "aria-hidden": "true" }, "→"),
      ),
    ),
  );

  // Override justification popover (always at bottom when present)
  if (pair.override?.popover) {
    sections.push(
      el(
        "section",
        {
          class:
            "rounded-md border border-[var(--color-border)] bg-[var(--color-bg-overlay)] p-3 space-y-1",
        },
        el(
          "p",
          { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold" },
          "Why this is annotated",
        ),
        el("p", { class: "text-sm text-[var(--color-fg-primary)]" }, pair.override.popover),
        el(
          "a",
          {
            href: pair.override.source_url,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "text-xs underline text-[var(--color-fg-muted)]",
          },
          "Source →",
        ),
      ),
    );
  }

  return sections;
}

export function createMechanismSheet(): MechanismSheetHandle {
  let lastFocus: HTMLElement | null = null;
  let dragStartY: number | null = null;
  let dragOffset = 0;
  let isOpen = false;
  let releaseTrap: (() => void) | null = null;

  // --- structure ---
  const dragHandle = el("div", {
    class: "mx-auto my-2 h-1 w-9 rounded-full bg-[var(--color-fg-muted)] opacity-50 cursor-grab",
    "aria-hidden": "true",
  });
  const closeBtn = el(
    "button",
    {
      type: "button",
      class:
        "absolute top-3 right-3 inline-flex items-center justify-center min-h-touch min-w-touch rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
      "aria-label": "Close mechanism details",
    },
    "×",
  );
  const content = el("div", {
    class: "px-5 pb-6 pt-2 space-y-5 overflow-y-auto",
    style: "max-height: calc(75vh - 60px);",
  });
  const sheet = el(
    "div",
    {
      class:
        "glass fixed left-0 right-0 bottom-0 z-[60] mx-auto max-w-2xl rounded-t-2xl shadow-2xl transform transition-transform duration-200 ease-out motion-reduce:transition-opacity motion-reduce:transform-none translate-y-full",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Mechanism details",
      tabindex: "-1",
    },
    dragHandle,
    closeBtn,
    content,
  );
  const backdrop = el("div", {
    class:
      "fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none pointer-events-none",
    "aria-hidden": "true",
  });

  const root = el(
    "div",
    { class: "ps-mechanism-sheet hidden" },
    backdrop,
    sheet,
  );

  // --- helpers ---
  function applyOpen(): void {
    root.classList.remove("hidden");
    root.classList.add(SHEET_OPEN_CLASS);
    // Allow the browser to paint the hidden→visible transition before sliding in.
    requestAnimationFrame(() => {
      sheet.classList.remove("translate-y-full");
      backdrop.classList.remove("opacity-0", "pointer-events-none");
      backdrop.classList.add("opacity-100");
    });
    document.body.classList.add(BODY_LOCK_CLASS);
    isOpen = true;
    // Keep keyboard focus inside the sheet while it's open.
    releaseTrap = trapFocus(sheet);
    // Focus the close button so keyboard users land somewhere reasonable.
    setTimeout(() => closeBtn.focus(), 60);
  }

  function applyClose(): void {
    sheet.classList.add("translate-y-full");
    sheet.style.removeProperty("transform");
    backdrop.classList.remove("opacity-100");
    backdrop.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => {
      root.classList.add("hidden");
      root.classList.remove(SHEET_OPEN_CLASS);
    }, 220);
    document.body.classList.remove(BODY_LOCK_CLASS);
    isOpen = false;
    if (releaseTrap) {
      releaseTrap();
      releaseTrap = null;
    }
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
    lastFocus = null;
  }

  function open(pair: PairwiseRisk, dataset: LeanDataset | undefined): void {
    lastFocus = (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);
    const nodes = renderContent(pair, dataset);
    replace(content, ...nodes);
    if (isOpen) {
      // Already open — just swap content (different tile tapped)
      content.scrollTop = 0;
      return;
    }
    applyOpen();
  }

  function close(): void {
    if (!isOpen) return;
    applyClose();
  }

  // --- event wiring ---
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  // Drag-to-dismiss via pointer events. Drag handle is the only grab affordance
  // (so the whole sheet body isn't accidentally dragged while reading).
  function onPointerDown(event: PointerEvent): void {
    if (!isOpen) return;
    dragStartY = event.clientY;
    dragOffset = 0;
    sheet.style.transition = "none";
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: PointerEvent): void {
    if (dragStartY === null) return;
    const delta = event.clientY - dragStartY;
    if (delta <= 0) return; // only drag down, not up
    dragOffset = delta;
    sheet.style.transform = `translateY(${delta}px)`;
  }
  function onPointerUp(): void {
    if (dragStartY === null) return;
    sheet.style.transition = "";
    if (dragOffset > 120) {
      close();
    } else {
      sheet.style.transform = "";
    }
    dragStartY = null;
    dragOffset = 0;
  }
  dragHandle.addEventListener("pointerdown", onPointerDown);
  dragHandle.addEventListener("pointermove", onPointerMove);
  dragHandle.addEventListener("pointerup", onPointerUp);
  dragHandle.addEventListener("pointercancel", onPointerUp);

  return {
    element: root,
    open,
    close,
    isOpen: () => isOpen,
  };
}
