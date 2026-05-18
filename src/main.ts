/**
 * partysafe entry point.
 *
 * M0 status: scaffolding only. Mounts a minimal placeholder UI to verify
 * the build + design tokens work end-to-end. Real components land in M2.
 *
 * Locked decisions from PLAN.md that this file enforces:
 * - DOM mutation policy (Eng E13/E25): textContent only. No innerHTML assignments.
 *   ESLint enforces this; see .eslintrc.json.
 * - Dark mode is default (Design D3). prefers-color-scheme is honored;
 *   manual toggle via html.light-mode / html.dark-mode (lands in M5 menu).
 * - Sticky emergency action bar mount point exists in index.html;
 *   the real component lands in M5.
 */

const APP_VERSION = "0.1.0-m0";

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") el.className = value;
    else el.setAttribute(key, value);
  }
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderTopBar(target: HTMLElement): void {
  target.replaceChildren();
  const wrap = createElement("div", {
    class:
      "flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]",
  });
  const brand = createElement(
    "div",
    { class: "text-lg font-semibold tracking-tight" },
    "partysafe",
  );
  const menu = createElement(
    "button",
    {
      class:
        "menu inline-flex items-center justify-center min-h-touch min-w-touch text-sm text-[var(--color-fg-muted)]",
      type: "button",
      "aria-label": "Menu",
    },
    "☰",
  );
  wrap.append(brand, menu);
  target.append(wrap);
}

function renderPlaceholderApp(target: HTMLElement): void {
  target.replaceChildren();
  const wrap = createElement("section", {
    class: "mx-auto max-w-2xl px-4 py-8 space-y-6",
  });

  const banner = createElement("div", {
    class:
      "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4",
  });
  banner.append(
    createElement(
      "h1",
      { class: "text-2xl font-semibold text-[var(--color-fg-primary)]" },
      "M0 — scaffolding live",
    ),
    createElement(
      "p",
      { class: "mt-2 text-sm text-[var(--color-fg-muted)]" },
      "Design tokens, dark mode, CSP, Referrer-Policy, and structural mounts are in place. Real UI components land in M2 (substance picker, combo grid). Mechanism content lands in M3.",
    ),
  );

  const sevWrap = createElement("div", { class: "space-y-2" });
  sevWrap.append(
    createElement(
      "h2",
      { class: "text-sm font-medium text-[var(--color-fg-muted)]" },
      "Severity token preview (dark mode default)",
    ),
  );
  const sevRow = createElement("div", { class: "flex flex-wrap gap-2" });

  const severityPreview: Array<[string, string, string]> = [
    ["sev-synergy", "Reported Synergy", "ⓘ"],
    ["sev-low-no-syn", "Low risk", "✓"],
    ["sev-low-decrease", "Low / decrease", "↓"],
    ["sev-caution", "Caution", "⚠"],
    ["sev-unsafe", "Unsafe", "⊘"],
    ["sev-dangerous", "Dangerous", "☠"],
  ];

  for (const [token, label, icon] of severityPreview) {
    const chip = createElement("span", {
      class: "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium",
      style: `background-color: color-mix(in srgb, var(--color-${token}) 20%, transparent); color: var(--color-${token}); border-left: 4px solid var(--color-${token});`,
    });
    chip.append(
      createElement("span", { "aria-hidden": "true" }, icon),
      createElement("span", {}, label),
    );
    sevRow.append(chip);
  }
  sevWrap.append(sevRow);

  const danger = createElement("div", {
    class:
      "pattern-danger-stripes rounded-md p-3 text-sm font-medium text-white bg-[var(--color-sev-dangerous)]",
  });
  danger.append(
    createElement("span", {}, "Dangerous (with stripe pattern for color-blind + B&W print)"),
  );
  sevWrap.append(danger);

  const meta = createElement("p", {
    class: "text-xs text-[var(--color-fg-muted)] pt-4 border-t border-[var(--color-border)]",
  });
  meta.append(
    document.createTextNode(`partysafe ${APP_VERSION} · `),
    createElement(
      "a",
      { href: "#/about", class: "underline" },
      "About",
    ),
    document.createTextNode(" · Data: TripSit (CC BY-NC-SA) — not medical advice."),
  );

  wrap.append(banner, sevWrap, meta);
  target.append(wrap);
}

function renderEmergencyBar(target: HTMLElement): void {
  target.replaceChildren();
  const wrap = createElement("div", {
    class:
      "fixed bottom-0 inset-x-0 z-50 flex border-t border-[var(--color-border)] bg-[var(--color-emergency-bar)]",
    style: "height: 4rem;",
  });

  const emergencyBtn = createElement("a", {
    href: "#/emergency",
    class:
      "flex-1 inline-flex items-center justify-center gap-2 text-[var(--color-emergency-fg)] font-medium hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
    "aria-label": "Open emergency information panel",
  });
  emergencyBtn.append(
    createElement(
      "span",
      { "aria-hidden": "true", style: "color: var(--color-emergency-icon);" },
      "⚠",
    ),
    createElement("span", {}, "Emergency"),
  );

  const callBtn = createElement("a", {
    href: "tel:911",
    class:
      "flex-1 inline-flex items-center justify-center gap-2 border-l border-[var(--color-border)] text-[var(--color-emergency-fg)] font-medium hover:bg-[var(--color-bg-overlay)] focus-visible:bg-[var(--color-bg-overlay)] motion-reduce:transition-none",
    "aria-label": "Call emergency services",
  });
  callBtn.append(
    createElement("span", { "aria-hidden": "true" }, "📞"),
    createElement("span", {}, "Call 911 / 112"),
  );

  wrap.append(emergencyBtn, callBtn);
  target.append(wrap);
}

function mount(): void {
  const topBar = document.getElementById("top-bar-mount");
  const app = document.getElementById("app");
  const emergencyBar = document.getElementById("emergency-bar-mount");
  if (!topBar || !app || !emergencyBar) {
    // eslint-disable-next-line no-console
    console.error("partysafe: required mount points missing in index.html");
    return;
  }
  renderTopBar(topBar);
  renderPlaceholderApp(app);
  renderEmergencyBar(emergencyBar);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
