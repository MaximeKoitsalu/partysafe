/**
 * partysafe entry point.
 *
 * Wires:
 *   - TopBar + EmergencyActionBar (always rendered)
 *   - SubstancePicker + ComboBanner + ComboGrid (combo route)
 *   - Hash router → state → re-render on route change
 *   - Lazy data load (fetch JSON; render shells immediately)
 *
 * Bottom-sheet mechanism explainer / drug detail / emergency view / about
 * land in M3-M5. For M2, tapping a combo tile dispatches a custom event;
 * we render a temporary inline expansion until the sheet exists.
 */

import { createTopBar } from "./components/TopBar.ts";
import { createEmergencyActionBar } from "./components/EmergencyActionBar.ts";
import { createSubstancePicker, type SubstancePickerHandle } from "./components/SubstancePicker.ts";
import { createComboBanner, type ComboBannerHandle } from "./components/ComboBanner.ts";
import { createComboGrid, type ComboGridHandle } from "./components/ComboGrid.ts";
import { createMechanismSheet, type MechanismSheetHandle } from "./components/MechanismSheet.ts";
import { loadAll } from "./data/load.ts";
import { el, replace } from "./lib/dom.ts";
import { pairwiseRisksFor } from "./lib/combo.ts";
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
let sheet: MechanismSheetHandle;
let comboSection: HTMLElement;

function computeAnalysis(): ComboAnalysis | undefined {
  if (!state.dataset || !state.mechanisms) return undefined;
  return pairwiseRisksFor(state.selection, {
    dataset: state.dataset,
    mechanisms: state.mechanisms,
    ...(state.overrides && { overrides: state.overrides }),
  });
}

function renderCombo(): void {
  picker.setSelection(state.selection);
  const analysis = computeAnalysis();
  banner.update(analysis, state.selection.length);
  grid.update(analysis, state.dataset);
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
      renderPlaceholder(
        `${state.dataset?.[route.substance]?.pretty_name ?? route.substance} — factsheet`,
        "Per-substance factsheet pages land in M4. They will show dose ranges, duration, onset, harm-reduction tips, and links to upstream sources.",
      );
      break;
    case "emergency":
      renderPlaceholder(
        "Emergency",
        "The full emergency view (signs of overdose, recovery position diagram, regional hotlines) lands in M5. In an emergency right now: call 911 (US) / 112 (EU) / 999 (UK) / 000 (AU).",
      );
      break;
    case "about":
      renderPlaceholder(
        "About partysafe",
        "License (CC BY-NC-SA 4.0), attribution to TripSit and other harm-reduction sources, and the full disclaimer land in M5. For now see ATTRIBUTION.md and DISCLAIMER.md in the repo.",
      );
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
  state.selection = slugs;
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

  const lang = typeof navigator !== "undefined" ? navigator.language : undefined;
  replace(emergencyMount, createEmergencyActionBar(lang));

  picker = createSubstancePicker({ onSelectionChange });
  banner = createComboBanner();
  sheet = createMechanismSheet();
  grid = createComboGrid({
    onTileClick: (pair: PairwiseRisk) => sheet.open(pair, state.dataset),
  });
  comboSection = el("div", { class: "mx-auto max-w-2xl px-4 py-6 space-y-4" });

  replace(appMount, comboSection);
  // Mount the sheet at the body level so it overlays the entire viewport.
  document.body.appendChild(sheet.element);
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
