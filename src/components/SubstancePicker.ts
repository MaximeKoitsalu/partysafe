/**
 * SubstancePicker — WAI-ARIA Combobox with inline autocomplete + chips.
 *
 * Locked spec (PLAN.md Design D4):
 *   - Full-width 56px text input (18px font); 44px tap targets on chips.
 *   - Chips below input; "×" removes; "+" focus-shifts to input.
 *   - Dropdown panel: up to 8 matches; canonical name (bold) + alias-matched
 *     (muted, italic) so the user sees why a match appeared.
 *   - 5th substance attempt: input disabled with helper text.
 *   - Ambiguous slug → multi-row dropdown each with disambiguator description.
 *
 * Input gating: every selection passes through validateSlug() (branded type).
 * Free-text picker input never reaches the DOM via innerHTML — only via
 * textContent through el().
 */

import { el, replace } from "../lib/dom.ts";
import { rankMatches, type Match } from "../lib/match.ts";
import {
  asSlug,
  buildSynonymIndex,
  validateSlug,
  type SynonymHit,
  type SynonymIndex,
} from "../lib/synonyms.ts";
import { MAX_SUBSTANCES } from "../router.ts";
import type { LeanDataset, LeanSubstance, SubstanceSlug } from "../types.ts";

export type SubstancePickerHandle = {
  element: HTMLElement;
  setDataset(dataset: LeanDataset): void;
  setSelection(slugs: SubstanceSlug[]): void;
  /** Force-clear the input field — used by the router when navigating away. */
  clearInput(): void;
};

export type SubstancePickerOptions = {
  /** Called whenever the user changes the selection (add / remove / clear). */
  onSelectionChange: (slugs: SubstanceSlug[]) => void;
};

type State = {
  dataset?: LeanDataset;
  index?: SynonymIndex;
  selection: SubstanceSlug[];
  query: string;
  highlightedOption: number;
  // When the user starts typing a slug that resolves to multiple substances,
  // surface them as a disambiguation row instead of a single match.
  ambiguity?: { query: string; hits: SynonymHit[] };
};

type DropdownItem =
  | { kind: "match"; slug: SubstanceSlug; canonical: string; aliasMatched?: string }
  | { kind: "disambiguate"; slug: SubstanceSlug; canonical: string; categories: string[] };

const INPUT_ID = "ps-picker-input";
const LISTBOX_ID = "ps-picker-listbox";

// Tap-to-add palette for the festival audience (no typing needed). Ordered by
// rough festival prevalence; only those present in the dataset are rendered.
const POPULAR_SLUGS = [
  "mdma",
  "ketamine",
  "cocaine",
  "lsd",
  "alcohol",
  "cannabis",
  "mushrooms",
  "2c-b",
  "mda",
  "amphetamine",
  "ghb",
  "nitrous",
];

export function createSubstancePicker(options: SubstancePickerOptions): SubstancePickerHandle {
  const state: State = {
    selection: [],
    query: "",
    highlightedOption: -1,
  };

  // Stable element references — we mutate their children rather than rebuilding the tree.
  const wrap = el("div", { class: "space-y-2" });
  const label = el(
    "label",
    { class: "block text-sm font-medium text-[var(--color-fg-muted)]", for: INPUT_ID },
    "Pick 2–4 substances",
  );
  const chipRow = el("div", {
    class: "flex flex-wrap gap-2",
    role: "list",
    "aria-label": "Selected substances",
  });
  const inputWrap = el("div", { class: "relative" });
  const input = el("input", {
    id: INPUT_ID,
    type: "text",
    autocomplete: "off",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: "false",
    role: "combobox",
    "aria-controls": LISTBOX_ID,
    "aria-expanded": "false",
    "aria-autocomplete": "list",
    class:
      "w-full min-h-touch rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 text-base text-[var(--color-fg-primary)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sev-caution)]",
    placeholder: "Search to add a substance (e.g. MDMA, molly, ketamine)",
  });
  const listbox = el("ul", {
    id: LISTBOX_ID,
    role: "listbox",
    "aria-label": "Substance matches",
    class:
      "absolute left-0 right-0 top-full mt-1 z-30 max-h-72 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg hidden",
  });
  const helper = el("p", {
    class: "text-xs text-[var(--color-fg-muted)]",
  });
  const quickPick = el("div", { class: "space-y-1.5" });

  inputWrap.append(input, listbox);
  wrap.append(label, chipRow, inputWrap, helper, quickPick);

  function renderQuickPick(): void {
    // Hide the palette once the user is at the cap (nothing more to add).
    if (!state.dataset || state.selection.length >= MAX_SUBSTANCES) {
      replace(quickPick);
      return;
    }
    const buttons: HTMLElement[] = [];
    for (const slug of POPULAR_SLUGS) {
      const sub = state.dataset[slug];
      if (!sub) continue; // not in dataset this pin
      if (state.selection.includes(slug as SubstanceSlug)) continue; // already chosen
      buttons.push(
        el(
          "button",
          {
            type: "button",
            class:
              "inline-flex items-center min-h-touch rounded-full border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-1.5 text-sm text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
            "data-action": "quick-add",
            "data-slug": slug,
          },
          el("span", { "aria-hidden": "true", class: "mr-1 text-[var(--color-fg-muted)]" }, "+"),
          sub.pretty_name,
        ),
      );
    }
    if (buttons.length === 0) {
      replace(quickPick);
      return;
    }
    replace(
      quickPick,
      el(
        "p",
        { class: "text-xs text-[var(--color-fg-muted)]" },
        "Popular at festivals — tap to add:",
      ),
      el(
        "div",
        { class: "flex flex-wrap gap-2", role: "group", "aria-label": "Popular substances" },
        ...buttons,
      ),
    );
  }

  function renderChips(): void {
    const atCap = state.selection.length >= MAX_SUBSTANCES;
    if (state.selection.length === 0) {
      replace(
        chipRow,
        el(
          "span",
          { class: "text-sm italic text-[var(--color-fg-muted)]" },
          "No substances selected yet — start typing below.",
        ),
      );
      return;
    }
    const nodes: HTMLElement[] = [];
    for (const slug of state.selection) {
      const sub = state.dataset?.[slug];
      const pretty = sub?.pretty_name ?? slug;
      nodes.push(
        el(
          "span",
          {
            class:
              "inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-overlay)] pl-3 pr-1 py-1 text-sm font-medium text-[var(--color-fg-primary)]",
            role: "listitem",
          },
          pretty,
          el(
            "button",
            {
              type: "button",
              class:
                "inline-flex items-center justify-center min-h-touch min-w-touch rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-base)] focus-visible:bg-[var(--color-bg-base)] motion-reduce:transition-none",
              "aria-label": `Remove ${pretty}`,
              "data-action": "remove",
              "data-slug": slug,
            },
            "×",
          ),
        ),
      );
    }
    if (!atCap) {
      nodes.push(
        el(
          "button",
          {
            type: "button",
            class:
              "inline-flex items-center justify-center min-h-touch min-w-touch rounded-full bg-[var(--color-bg-overlay)] text-[var(--color-fg-primary)] font-medium hover:bg-[var(--color-bg-base)] focus-visible:bg-[var(--color-bg-base)] motion-reduce:transition-none",
            "aria-label": "Focus the search input to add another substance",
            "data-action": "focus-input",
          },
          "+",
        ),
      );
    }
    replace(chipRow, ...nodes);
  }

  function renderHelper(): void {
    const remaining = MAX_SUBSTANCES - state.selection.length;
    if (state.selection.length === 0) {
      replace(helper, "Pick at least 2 substances to see how they interact.");
    } else if (state.selection.length === 1) {
      replace(helper, "Pick at least one more to see the combo.");
    } else if (state.selection.length >= MAX_SUBSTANCES) {
      replace(
        helper,
        "Maximum 4 substances. Cumulative interactions beyond pairwise are not modeled.",
      );
    } else {
      replace(helper, `Add up to ${remaining} more substance${remaining === 1 ? "" : "s"}.`);
    }
    if (state.selection.length >= MAX_SUBSTANCES) {
      input.setAttribute("disabled", "true");
      input.setAttribute("aria-disabled", "true");
    } else {
      input.removeAttribute("disabled");
      input.removeAttribute("aria-disabled");
    }
  }

  function computeDropdown(): DropdownItem[] {
    if (!state.dataset || !state.index || !state.query.trim()) return [];
    const q = state.query.trim().toLowerCase();
    // Pull every entry in the dataset, filter by haystack score against query.
    // Haystack = canonical name + every alias, separated by spaces.
    const items: Array<{ slug: SubstanceSlug; haystack: string; aliasHit?: string }> = [];
    for (const [name, sub] of Object.entries(state.dataset)) {
      const slug = validateSlug(name);
      if (!slug) continue;
      if (state.selection.includes(slug)) continue;
      items.push({ slug, haystack: `${name} ${sub.pretty_name} ${sub.aliases.join(" ")}` });
    }
    const ranked = rankMatches(items, q, (i) => i.haystack, 8);

    // For each ranked match, pick the best alias-displayed name to surface so the
    // user sees why the match appeared.
    return ranked.map(({ item }: Match<{ slug: SubstanceSlug; haystack: string }>) => {
      const sub = state.dataset![item.slug] as LeanSubstance;
      const aliasHit = pickAliasMatch(sub, q);
      const result: DropdownItem = {
        kind: "match",
        slug: item.slug,
        canonical: sub.pretty_name,
        ...(aliasHit && { aliasMatched: aliasHit }),
      };
      return result;
    });
  }

  function pickAliasMatch(sub: LeanSubstance, q: string): string | undefined {
    if (sub.name.toLowerCase().includes(q)) return undefined;
    if (sub.pretty_name.toLowerCase().includes(q)) return undefined;
    for (const alias of sub.aliases) {
      if (alias.toLowerCase().includes(q)) return alias;
    }
    return undefined;
  }

  function renderDropdown(): void {
    const items = computeDropdown();
    if (items.length === 0 || state.selection.length >= MAX_SUBSTANCES) {
      listbox.classList.add("hidden");
      input.setAttribute("aria-expanded", "false");
      replace(listbox);
      return;
    }
    listbox.classList.remove("hidden");
    input.setAttribute("aria-expanded", "true");

    const nodes: HTMLElement[] = [];
    items.forEach((item, idx) => {
      const isHighlighted = idx === state.highlightedOption;
      const node = el(
        "li",
        {
          role: "option",
          "aria-selected": isHighlighted ? "true" : "false",
          class: `flex items-baseline gap-2 px-4 py-3 cursor-pointer ${
            isHighlighted
              ? "bg-[var(--color-bg-overlay)]"
              : "hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)]"
          }`,
          "data-action": "select",
          "data-slug": item.slug,
          tabindex: "-1",
        },
        el("span", { class: "font-semibold text-base text-[var(--color-fg-primary)]" }, item.canonical),
        item.kind === "match" && item.aliasMatched
          ? el(
              "span",
              { class: "text-sm italic text-[var(--color-fg-muted)]" },
              `also known as ${item.aliasMatched}`,
            )
          : undefined,
      );
      nodes.push(node);
    });
    replace(listbox, ...nodes);
  }

  function commit(): void {
    options.onSelectionChange([...state.selection]);
    renderChips();
    renderHelper();
    renderDropdown();
    renderQuickPick();
  }

  function addSlug(slug: SubstanceSlug): void {
    if (state.selection.includes(slug)) return;
    if (state.selection.length >= MAX_SUBSTANCES) return;
    state.selection.push(slug);
    state.query = "";
    state.highlightedOption = -1;
    input.value = "";
    commit();
  }

  function removeSlug(slug: SubstanceSlug): void {
    const idx = state.selection.indexOf(slug);
    if (idx < 0) return;
    state.selection.splice(idx, 1);
    commit();
  }

  // --- event wiring ---

  input.addEventListener("input", () => {
    state.query = input.value;
    state.highlightedOption = state.query.trim() ? 0 : -1;
    renderDropdown();
  });

  input.addEventListener("focus", () => {
    if (state.query.trim()) renderDropdown();
  });

  input.addEventListener("blur", () => {
    // Delay so clicks on listbox items register before we hide.
    setTimeout(() => {
      listbox.classList.add("hidden");
      input.setAttribute("aria-expanded", "false");
    }, 150);
  });

  input.addEventListener("keydown", (event) => {
    const items = computeDropdown();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (items.length === 0) return;
      state.highlightedOption = (state.highlightedOption + 1) % items.length;
      renderDropdown();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      state.highlightedOption =
        (state.highlightedOption - 1 + items.length) % items.length;
      renderDropdown();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const idx = state.highlightedOption >= 0 ? state.highlightedOption : 0;
      const pick = items[idx];
      if (pick) addSlug(pick.slug);
    } else if (event.key === "Escape") {
      state.query = "";
      input.value = "";
      state.highlightedOption = -1;
      renderDropdown();
    } else if (event.key === "Backspace" && !state.query && state.selection.length > 0) {
      // Backspace on empty input removes the last chip — iOS Mail pattern.
      const last = state.selection[state.selection.length - 1];
      if (last) removeSlug(last);
    }
  });

  // Delegate clicks for chip remove + listbox selection + + button.
  wrap.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const actionEl = target?.closest("[data-action]") as HTMLElement | null;
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-action");
    const slug = actionEl.getAttribute("data-slug");
    if (action === "remove" && slug) {
      const validated = validateSlug(slug);
      if (validated) removeSlug(validated);
    } else if (action === "focus-input") {
      input.focus();
    } else if ((action === "select" || action === "quick-add") && slug) {
      const validated = validateSlug(slug);
      if (validated) addSlug(validated);
    }
  });

  renderChips();
  renderHelper();
  renderDropdown();
  renderQuickPick();

  return {
    element: wrap,
    setDataset(dataset: LeanDataset): void {
      state.dataset = dataset;
      state.index = buildSynonymIndex(dataset);
      renderChips();
      renderDropdown();
      renderQuickPick();
    },
    setSelection(slugs: SubstanceSlug[]): void {
      // Normalize externally-supplied selection through asSlug to keep the
      // branded type invariant intact.
      state.selection = slugs.slice(0, MAX_SUBSTANCES).map((s) => asSlug(String(s)));
      state.query = "";
      input.value = "";
      renderChips();
      renderHelper();
      renderDropdown();
      renderQuickPick();
    },
    clearInput(): void {
      state.query = "";
      input.value = "";
      state.highlightedOption = -1;
      renderDropdown();
    },
  };
}
