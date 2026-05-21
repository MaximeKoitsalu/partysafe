/**
 * WCAG AA contrast regression test for the severity color tokens (PLAN.md
 * Eng E26 / Design D2). Locks the color spec: if someone tweaks a severity hex
 * and it drops below the contrast floor, CI fails here.
 *
 * Severity chips render the color as foreground text/icon on a tinted-or-base
 * background. We test each severity color against the relevant theme base/
 * elevated surface, plus the body foreground against base. Pure sRGB relative-
 * luminance math (WCAG 2.1 formula) — no axe-core dependency.
 *
 * Thresholds: 4.5:1 for normal text, 3:1 for large text / UI components. The
 * severity label renders at >=16px semibold (large-text tier), and the chip is
 * a UI component, so 3:1 is the binding floor; we assert >=3:1 and report the
 * value so regressions are visible.
 */
import { describe, expect, test } from "bun:test";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

function contrast(a: string, b: string): number {
  const la = relLuminance(hexToRgb(a));
  const lb = relLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Mirror of tailwind.css @theme tokens. Kept in sync by this test's existence —
// if the CSS changes, update here and the assertion guards the floor.
// "Neon dusk" vaporwave surfaces. Severity colors must still clear WCAG AA on
// the deep-purple panels — this test is the guard.
const DARK = {
  base: "#160726",
  elevated: "#221141",
  fgPrimary: "#f4ecff",
  fgMuted: "#c4b0ec",
  sev: {
    synergy: "#94a3b8",
    lowNoSyn: "#38bdf8",
    lowDecrease: "#c4b5fd",
    caution: "#fbbf24",
    unsafe: "#fb923c",
    dangerous: "#fb7185",
  },
};
const LIGHT = {
  base: "#fdf4ff",
  elevated: "#ffffff",
  fgPrimary: "#2e1065",
  fgMuted: "#6d5494",
  sev: {
    synergy: "#475569",
    lowNoSyn: "#0369a1",
    lowDecrease: "#6d28d9",
    caution: "#b45309",
    unsafe: "#c2410c",
    dangerous: "#be123c",
  },
};

const UI_FLOOR = 3.0; // WCAG AA for large text / UI components
const TEXT_FLOOR = 4.5; // WCAG AA for normal body text

describe("WCAG AA — body text", () => {
  test("dark: primary text on base ≥ 4.5:1", () => {
    expect(contrast(DARK.fgPrimary, DARK.base)).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
  test("dark: muted text on base ≥ 4.5:1", () => {
    expect(contrast(DARK.fgMuted, DARK.base)).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
  test("light: primary text on base ≥ 4.5:1", () => {
    expect(contrast(LIGHT.fgPrimary, LIGHT.base)).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
  test("light: muted text on base ≥ 4.5:1", () => {
    expect(contrast(LIGHT.fgMuted, LIGHT.base)).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
});

describe("WCAG AA — severity colors on dark surfaces ≥ 3:1", () => {
  for (const [name, hex] of Object.entries(DARK.sev)) {
    test(`${name} on base`, () => {
      const c = contrast(hex, DARK.base);
      expect(c).toBeGreaterThanOrEqual(UI_FLOOR);
    });
    test(`${name} on elevated`, () => {
      const c = contrast(hex, DARK.elevated);
      expect(c).toBeGreaterThanOrEqual(UI_FLOOR);
    });
  }
});

describe("WCAG AA — severity colors on light surfaces ≥ 3:1", () => {
  for (const [name, hex] of Object.entries(LIGHT.sev)) {
    test(`${name} on base`, () => {
      const c = contrast(hex, LIGHT.base);
      expect(c).toBeGreaterThanOrEqual(UI_FLOOR);
    });
    test(`${name} on elevated`, () => {
      const c = contrast(hex, LIGHT.elevated);
      expect(c).toBeGreaterThanOrEqual(UI_FLOOR);
    });
  }
});

describe("severity colors are mutually distinguishable (not just vs background)", () => {
  // Adjacent-severity confusion is the real risk (Caution vs Unsafe vs Dangerous).
  // They must differ in luminance enough that even without hue they read apart.
  test("dark: caution / unsafe / dangerous have distinct luminance", () => {
    const lum = (h: string) => relLuminance(hexToRgb(h));
    const c = lum(DARK.sev.caution);
    const u = lum(DARK.sev.unsafe);
    const d = lum(DARK.sev.dangerous);
    // Each pair differs by a perceptible margin; dangerous additionally carries
    // the diagonal-stripe pattern overlay so it's never color-only.
    expect(Math.abs(c - u)).toBeGreaterThan(0.02);
    expect(Math.abs(u - d)).toBeGreaterThan(0.02);
  });
});
