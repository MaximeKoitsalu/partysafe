/**
 * partysafe entry point.
 *
 * Wires:
 *   - TopBar + EmergencyActionBar (always rendered)
 *   - SubstancePicker + ComboBanner + ComboGrid + TimelineStrip (combo route)
 *   - DrugDetail factsheet (#/drug/[slug])
 *   - MechanismSheet bottom sheet (combo tile tap)
 *   - Hash router → state → re-render on route change
 *   - Lazy data load (fetch JSON; render shells immediately)
 *
 * Emergency view / about land in M5.
 */

import { createTopBar } from "./components/TopBar.ts";
import { createEmergencyActionBar, type EmergencyActionBarHandle } from "./components/EmergencyActionBar.ts";
import { createSubstancePicker, type SubstancePickerHandle } from "./components/SubstancePicker.ts";
import { createComboBanner, type ComboBannerHandle } from "./components/ComboBanner.ts";
import { createComboGrid, type ComboGridHandle } from "./components/ComboGrid.ts";
import { createTimelineStrip, type TimelineStripHandle } from "./components/TimelineStrip.ts";
import { createMechanismSheet, type MechanismSheetHandle } from "./components/MechanismSheet.ts";
import { createDisclaimerBanner, type DisclaimerHandle } from "./components/DisclaimerBanner.ts";
import { renderDrugDetail } from "./components/DrugDetail.ts";
import { renderEmergencyView } from "./components/EmergencyView.ts";
import { renderAboutView } from "./components/AboutView.ts";
import { loadAll } from "./data/load.ts";
import { el, replace } from "./lib/dom.ts";
import { pairwiseRisksFor } from "./lib/combo.ts";
import { pushRecentCombo } from "./lib/storage.ts";
import {
  currentRoute,
  navigate,
  parseRoute,
  serializeRoute,
  subscribe,
  type ParsedRoute,
} from "./router.ts";
import type {
  ComboAnalysis,
  LeanDataset,
  MechanismFile,
  PairwiseRisk,
  SubstanceSlug,
} from "./types.ts";
import type { OverrideFile } from "./lib/combo.ts";

type AppState = {
  selection: SubstanceSlug[];
  dataset?: LeanDataset;
  mechanisms?: MechanismFile;
  overrides?: OverrideFile;
};

const state: AppState = { selection: [] };
let picker: SubstancePickerHandle;
let banner: ComboBannerHandle;
let grid: ComboGridHandle;
let timeline: TimelineStripHandle;
let sheet: MechanismSheetHandle;
let disclaimer: DisclaimerHandle;
let actionBar: EmergencyActionBarHandle;
let appLang: string | undefined;
let comboSection: HTMLElement;
let readMoreMount: HTMLElement;
let disclaimerSeenThisSession = false;

function computeAnalysis(): ComboAnalysis | undefined {
  if (!state.dataset || !state.mechanisms) return undefined;
  return pairwiseRisksFor(state.selection, {
    dataset: state.dataset,
    mechanisms: state.mechanisms,
    ...(state.overrides && { overrides: state.overrides }),
  });
}

/** "Read more about X" cross-link rows below the grid (M4 task 3). */
function renderReadMore(): void {
  replace(readMoreMount);
  if (!state.dataset || state.selection.length === 0) return;
  readMoreMount.appendChild(
    el(
      "section",
      { class: "space-y-2", role: "region", "aria-label": "Substance factsheets" },
      el(
        "h3",
        { class: "text-xs uppercase tracking-wider text-[var(--color-fg-muted)]" },
        "Read more",
      ),
      ...state.selection.map((slug) => {
        const sub = state.dataset?.[slug];
        const pretty = sub?.pretty_name ?? slug;
        const cats = sub?.categories.filter((c) => c !== "common").slice(0, 2).join(" · ");
        return el(
          "a",
          {
            href: `#/drug/${slug}`,
            class:
              "flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 no-underline hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
          },
          el(
            "span",
            { class: "min-w-0" },
            el("span", { class: "block text-base font-semibold text-[var(--color-fg-primary)]" }, pretty),
            cats
              ? el("span", { class: "block text-sm text-[var(--color-fg-muted)]" }, cats)
              : undefined,
          ),
          el("span", { class: "text-[var(--color-fg-muted)] text-xl shrink-0", "aria-hidden": "true" }, "›"),
        );
      }),
    ),
  );
}

function renderCombo(): void {
  picker.setSelection(state.selection);
  const analysis = computeAnalysis();
  banner.update(analysis, state.selection.length);
  grid.update(analysis, state.dataset);
  timeline.update(state.selection, state.dataset);
  renderReadMore();
  // Close sheet whenever selection changes — the previously open mechanism no
  // longer matches the current grid.
  if (sheet?.isOpen()) sheet.close();
}

function renderHome(): void {
  replace(
    comboSection,
    banner.element,
    el(
      "section",
      { class: "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4" },
      picker.element,
    ),
    grid.element,
    timeline.element,
    readMoreMount,
  );
  renderCombo();
}

function renderPlaceholder(title: string, body: string): void {
  replace(
    comboSection,
    el(
      "section",
      {
        class:
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-3",
      },
      el("h1", { class: "text-2xl font-semibold text-[var(--color-fg-primary)]" }, title),
      el("p", { class: "text-base text-[var(--color-fg-muted)]" }, body),
      el(
        "a",
        {
          href: "#/",
          class: "inline-block text-sm font-medium text-[var(--color-sev-caution)] underline",
        },
        "← Back to combo planner",
      ),
    ),
  );
}

function renderRoute(route: ParsedRoute): void {
  switch (route.kind) {
    case "home":
    case "combo": {
      const incoming = route.kind === "combo" ? route.substances : [];
      const same =
        incoming.length === state.selection.length &&
        incoming.every((s, i) => s === state.selection[i]);
      if (!same) {
        state.selection = [...incoming];
      }
      renderHome();
      break;
    }
    case "drug":
      if (sheet?.isOpen()) sheet.close();
      replace(comboSection, renderDrugDetail(route.substance, state.dataset));
      window.scrollTo(0, 0);
      break;
    case "emergency":
      if (sheet?.isOpen()) sheet.close();
      replace(
        comboSection,
        renderEmergencyView({
          lang: appLang,
          onRegionChange: () => actionBar.refresh(),
        }),
      );
      window.scrollTo(0, 0);
      break;
    case "about":
      if (sheet?.isOpen()) sheet.close();
      replace(comboSection, renderAboutView());
      window.scrollTo(0, 0);
      break;
    case "unknown":
      renderPlaceholder(
        "Not found",
        `That route doesn't match anything I know how to render. Hash was: ${route.raw}`,
      );
      break;
  }
}

function onSelectionChange(slugs: SubstanceSlug[]): void {
  // First picker interaction this session triggers the disclaimer modal
  // (Design D9/H7 — first interaction, not page load).
  if (!disclaimerSeenThisSession) {
    disclaimerSeenThisSession = true;
    disclaimer.maybeShow();
  }
  state.selection = slugs;
  // Persist a complete combo (2+) to the local recents list (privacy: device-only).
  if (slugs.length >= 2) pushRecentCombo(slugs);
  // Update the URL without polluting history (Eng E5 picker change rule).
  navigate(
    slugs.length === 0
      ? { kind: "home" }
      : { kind: "combo", substances: slugs, warnings: [] },
    { replace: true },
  );
  renderCombo();
}

function mount(): void {
  const topBarMount = document.getElementById("top-bar-mount");
  const appMount = document.getElementById("app");
  const emergencyMount = document.getElementById("emergency-bar-mount");
  if (!topBarMount || !appMount || !emergencyMount) {
    console.error("partysafe: required mount points missing in index.html");
    return;
  }

  replace(topBarMount, createTopBar());

  appLang = typeof navigator !== "undefined" ? navigator.language : undefined;
  actionBar = createEmergencyActionBar(appLang);
  replace(emergencyMount, actionBar.element);

  picker = createSubstancePicker({ onSelectionChange });
  banner = createComboBanner();
  sheet = createMechanismSheet();
  timeline = createTimelineStrip();
  disclaimer = createDisclaimerBanner();
  grid = createComboGrid({
    onTileClick: (pair: PairwiseRisk) => sheet.open(pair, state.dataset),
  });
  comboSection = el("div", { class: "mx-auto max-w-2xl px-4 py-6 space-y-4" });
  readMoreMount = el("div", { class: "space-y-2" });

  replace(appMount, comboSection);
  // Mount the sheet + disclaimer at the body level so they overlay the viewport.
  document.body.appendChild(sheet.element);
  document.body.appendChild(disclaimer.element);
  renderRoute(currentRoute());
  subscribe(renderRoute);

  // Kick off data load in the background. UI shows shells until it resolves.
  loadAll()
    .then((data) => {
      state.dataset = data.dataset;
      state.mechanisms = data.mechanisms;
      state.overrides = data.overrides;
      picker.setDataset(data.dataset);
      // Re-render the current route now that data is available.
      renderRoute(currentRoute());
    })
    .catch((err) => {
      console.error("partysafe: failed to load data", err);
      replace(
        appMount,
        el(
          "div",
          { class: "mx-auto max-w-2xl px-4 py-12 text-center space-y-3" },
          el(
            "h1",
            { class: "text-xl font-semibold text-[var(--color-sev-unsafe)]" },
            "Data failed to load",
          ),
          el(
            "p",
            { class: "text-sm text-[var(--color-fg-muted)]" },
            "Reload the page. If the problem persists, the site assets may be missing.",
          ),
        ),
      );
    });
}

// Avoid running mount() during SSR / test environments.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}

// Re-export bits of the public API for the eventual debug surface and tests.
export { parseRoute, serializeRoute, currentRoute, navigate };
