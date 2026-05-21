import { describe, expect, test } from "bun:test";
import { cacheStrategyFor, shouldHandle } from "../lib/sw-strategy.ts";

describe("cacheStrategyFor", () => {
  test("navigation is always network-first (deploys reach users)", () => {
    expect(cacheStrategyFor("/partysafe/", "navigate")).toBe("network-first");
    expect(cacheStrategyFor("/partysafe/index.html", "navigate")).toBe("network-first");
  });

  test("immutable hashed JS/CSS assets are cache-first", () => {
    expect(cacheStrategyFor("/partysafe/assets/index-bL76kP0y.js")).toBe("cache-first");
    expect(cacheStrategyFor("/partysafe/assets/index-1qFBAk34.css")).toBe("cache-first");
  });

  test("hashed JSON datasets stay network-first (mutable safety content)", () => {
    expect(cacheStrategyFor("/partysafe/assets/mechanisms-DEVewVf8.json")).toBe("network-first");
    expect(cacheStrategyFor("/partysafe/assets/tripsit.lean-3y4guexc.json")).toBe("network-first");
    expect(cacheStrategyFor("/partysafe/assets/overrides-nhjekMUJ.json")).toBe("network-first");
  });

  test("non-hashed root files are network-first", () => {
    expect(cacheStrategyFor("/partysafe/favicon.svg")).toBe("network-first");
    expect(cacheStrategyFor("/partysafe/robots.txt")).toBe("network-first");
  });

  test("unknown same-origin paths default to network-first", () => {
    expect(cacheStrategyFor("/partysafe/something/else")).toBe("network-first");
  });
});

describe("shouldHandle", () => {
  test("handles same-origin GET", () => {
    expect(shouldHandle("GET", true)).toBe(true);
  });
  test("ignores non-GET", () => {
    expect(shouldHandle("POST", true)).toBe(false);
  });
  test("ignores cross-origin", () => {
    expect(shouldHandle("GET", false)).toBe(false);
  });
});
