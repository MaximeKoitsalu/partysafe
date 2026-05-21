/**
 * AboutView — license, attribution, privacy, design rationale, data controls.
 *
 * Locked spec (PLAN.md Design L3 + Eng E12):
 *   - License (CC BY-NC-SA 4.0) + attribution to TripSit and cited sources.
 *   - Privacy posture: what is stored locally, what never leaves the device.
 *   - "Why we don't show a green 'safe' label" design rationale (Design C1).
 *   - "Clear local data" button (clears disclaimer ack, region, recent combos).
 *
 * Pure render function; the clear-data button wires its own handler.
 */

import { el, replace } from "../lib/dom.ts";
import { clearAllLocalData, storedKeysSummary } from "../lib/storage.ts";

function section(title: string, ...body: (Node | string | undefined)[]): HTMLElement {
  return el(
    "section",
    { class: "space-y-2" },
    el("h2", { class: "text-base font-semibold text-[var(--color-fg-primary)]" }, title),
    ...body.filter((b): b is Node | string => b !== undefined),
  );
}

function link(href: string, text: string): HTMLElement {
  return el(
    "a",
    {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      class: "underline text-[var(--color-sev-caution)]",
    },
    text,
  );
}

export function renderAboutView(): HTMLElement {
  const clearStatus = el("p", { class: "text-sm text-[var(--color-fg-muted)]", "aria-live": "polite" });

  const clearBtn = el(
    "button",
    {
      type: "button",
      class:
        "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
    },
    "Clear all local data",
  );
  clearBtn.addEventListener("click", () => {
    clearAllLocalData();
    replace(clearStatus, "Cleared. Disclaimer, region choice, and recent combos have been removed from this device.");
  });

  return el(
    "article",
    { class: "space-y-6 pb-8" },
    el(
      "header",
      { class: "space-y-2" },
      el(
        "a",
        { href: "#/", class: "inline-block text-sm font-medium text-[var(--color-sev-caution)]" },
        "← Back to combo planner",
      ),
      el("h1", { class: "text-3xl font-semibold text-[var(--color-fg-primary)]" }, "About partysafe"),
    ),

    section(
      "What this is",
      el(
        "p",
        { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
        "partysafe is a harm-reduction reference for how recreational substances interact. Pick what you have or plan to take, and see the known pairwise risks in plain language, with what to watch for and what to do if something goes wrong. It is information, not medical advice.",
      ),
    ),

    section(
      "Why there is no green “safe” label",
      el(
        "p",
        { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
        "No drug combination is simply “safe.” Even low-risk pairings depend on dose, body, batch purity, and setting. A green checkmark is easy to screenshot out of context and pass off as an endorsement, so we don’t use one. Lower-risk combinations are shown in neutral blue with the interaction explained, never as a go-ahead.",
      ),
    ),

    section(
      "Data + attribution",
      el(
        "p",
        { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
        "Combination severities and substance facts come from the ",
        link("https://github.com/TripSit/drugs", "TripSit dataset"),
        " (CC BY-NC-SA 4.0). Mechanism explanations are written for partysafe, drawing on TripSit, ",
        link("https://dancesafe.org/", "DanceSafe"),
        ", ",
        link("https://psychonautwiki.org/", "PsychonautWiki"),
        ", ",
        link("https://www.erowid.org/", "Erowid"),
        ", and public-health sources (CDC, NHS, NIDA, MAPS). Each entry lists its sources.",
      ),
      el(
        "p",
        { class: "text-sm text-[var(--color-fg-muted)]" },
        "Mechanism content is draft pending review by qualified harm-reduction clinicians before public launch.",
      ),
    ),

    section(
      "License",
      el(
        "p",
        { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
        "partysafe is open source under ",
        link("https://creativecommons.org/licenses/by-nc-sa/4.0/", "CC BY-NC-SA 4.0"),
        ", matching the TripSit data. You may share and adapt it for non-commercial use with attribution, under the same license. Mirror it freely.",
      ),
    ),

    section(
      "Privacy",
      el(
        "p",
        { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
        "No accounts. No analytics. No cookies. No server ever sees what you select — everything runs in your browser. Shareable links contain only substance names, never anything about you.",
      ),
      el(
        "p",
        { class: "text-sm text-[var(--color-fg-muted)]" },
        "Stored on this device only:",
      ),
      el(
        "ul",
        { class: "list-disc list-outside ml-5 space-y-1 text-sm text-[var(--color-fg-muted)]" },
        ...storedKeysSummary().map((k) => el("li", {}, k.purpose)),
      ),
    ),

    section(
      "Your data",
      clearBtn,
      clearStatus,
    ),

    section(
      "In an emergency",
      el(
        "p",
        { class: "text-base text-[var(--color-fg-primary)] leading-relaxed" },
        "Call your local emergency number. ",
        el(
          "a",
          { href: "#/emergency", class: "underline text-[var(--color-sev-caution)]" },
          "Open the emergency panel",
        ),
        " for overdose signs, the recovery position, and region-specific support lines.",
      ),
    ),
  );
}
