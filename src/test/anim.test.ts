import { afterEach, describe, expect, test } from "bun:test";
import { popIn, prefersReducedMotion, revealOne, revealStagger } from "../lib/anim.ts";

const g = globalThis as { window?: unknown };
const originalWindow = g.window;

afterEach(() => {
  if (originalWindow === undefined) delete g.window;
  else g.window = originalWindow;
});

function mockReducedMotion(matches: boolean): void {
  g.window = {
    matchMedia: (q: string) => ({ matches: q.includes("reduce") ? matches : false }),
  };
}

describe("prefersReducedMotion", () => {
  test("false when window/matchMedia absent (SSR / test env)", () => {
    delete g.window;
    expect(prefersReducedMotion()).toBe(false);
  });

  test("true when the OS prefers reduced motion", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  test("false when the OS allows motion", () => {
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("animation wrappers are no-ops on the safe path (no DOM/anime call)", () => {
  // Under reduced motion OR with empty targets the wrappers must return before
  // touching anime.js — so calling them in a DOM-less env must not throw.
  test("reduced motion: revealStagger / revealOne / popIn don't call anime", () => {
    mockReducedMotion(true);
    expect(() => revealStagger([{} as unknown as Element])).not.toThrow();
    expect(() => revealOne({} as unknown as Element)).not.toThrow();
    expect(() => popIn({} as unknown as Element)).not.toThrow();
  });

  test("empty/undefined targets are a no-op", () => {
    mockReducedMotion(false);
    expect(() => revealStagger(null)).not.toThrow();
    expect(() => revealStagger([])).not.toThrow();
    expect(() => revealOne(undefined)).not.toThrow();
    expect(() => popIn(null)).not.toThrow();
  });
});
