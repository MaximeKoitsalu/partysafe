import { describe, expect, test } from "bun:test";
import {
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  SEVERITY_TOKENS,
  compareSeverity,
  isSeverity,
  maxSeverity,
  tokenFor,
} from "../lib/severity.ts";

describe("severity ordering", () => {
  test("SEVERITY_ORDER ranks risk ascending", () => {
    expect(SEVERITY_ORDER["Low Risk & Synergy"]).toBe(0);
    expect(SEVERITY_ORDER["Dangerous"]).toBe(5);
    expect(compareSeverity("Caution", "Dangerous")).toBeLessThan(0);
    expect(compareSeverity("Dangerous", "Caution")).toBeGreaterThan(0);
  });

  test("maxSeverity picks the riskiest of a list", () => {
    expect(maxSeverity(["Caution", "Unsafe", "Low Risk & Synergy"])).toBe("Unsafe");
    expect(maxSeverity(["Dangerous"])).toBe("Dangerous");
    expect(maxSeverity([])).toBeUndefined();
  });

  test("compareSeverity is transitive", () => {
    const sorted = [...SEVERITY_LABELS].sort(compareSeverity);
    expect(sorted).toEqual([...SEVERITY_LABELS]);
  });
});

describe("severity tokens", () => {
  test("every severity has a complete token (color+icon+pattern+qualifier+tone+label)", () => {
    for (const sev of SEVERITY_LABELS) {
      const t = SEVERITY_TOKENS[sev];
      expect(t).toBeDefined();
      expect(typeof t.label).toBe("string");
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.cssVar.startsWith("--color-")).toBe(true);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(typeof t.pattern).toBe("boolean");
      expect(t.qualifier.length).toBeGreaterThan(20);
    }
  });

  test("Low Risk & Synergy is rendered as Reported Synergy (not a green checkmark)", () => {
    const t = tokenFor("Low Risk & Synergy");
    expect(t.label).toBe("Reported Synergy");
    expect(t.icon).not.toBe("✓");
    expect(t.tone).toBe("neutral");
  });

  test("Dangerous gets a pattern overlay for color-blind + B&W print safety", () => {
    expect(tokenFor("Dangerous").pattern).toBe(true);
  });

  test("Unsafe and Dangerous qualifiers mention emergency services", () => {
    expect(tokenFor("Unsafe").qualifier.toLowerCase()).toContain("911");
    expect(tokenFor("Dangerous").qualifier.toLowerCase()).toContain("911");
  });

  test("isSeverity narrows strings correctly", () => {
    expect(isSeverity("Caution")).toBe(true);
    expect(isSeverity("super dangerous")).toBe(false);
    expect(isSeverity(undefined)).toBe(false);
    expect(isSeverity(7)).toBe(false);
  });
});
