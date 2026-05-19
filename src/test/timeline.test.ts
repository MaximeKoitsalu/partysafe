import { describe, expect, test } from "bun:test";
import { formatRange, parseRange, timelineFor } from "../lib/timeline.ts";

describe("parseRange", () => {
  test("range with unit minutes", () => {
    expect(parseRange("20-70", "minutes")).toEqual({ min: 20, max: 70 });
  });
  test("range with unit hours converts to minutes", () => {
    expect(parseRange("3-5", "hours")).toEqual({ min: 180, max: 300 });
  });
  test("single value", () => {
    expect(parseRange("90", "minutes")).toEqual({ min: 90, max: 90 });
  });
  test("approximate marker is stripped", () => {
    expect(parseRange("~2-3", "hours")).toEqual({ min: 120, max: 180 });
  });
  test("inline unit baked into value", () => {
    expect(parseRange("1-2 hours", undefined)).toEqual({ min: 60, max: 120 });
  });
  test("unparseable returns undefined", () => {
    expect(parseRange("a lot", "minutes")).toBeUndefined();
    expect(parseRange("", "minutes")).toBeUndefined();
    expect(parseRange(undefined, undefined)).toBeUndefined();
  });
});

describe("timelineFor", () => {
  test("returns onset + total + peak estimate when both inputs provided", () => {
    const t = timelineFor(
      { unit: "minutes", value: "20-70" },
      { unit: "hours", value: "3-5" },
    );
    expect(t.onset).toEqual({ min: 20, max: 70 });
    expect(t.total).toEqual({ min: 180, max: 300 });
    expect(t.peak_estimate).toBeDefined();
    expect(t.peak_estimate?.min).toBe(45); // midpoint of onset
    expect(t.peak_estimate?.max).toBe(180 + (300 - 180) * 0.6);
  });
  test("partial data returns partial segments without peak", () => {
    const t = timelineFor({ unit: "minutes", value: "20-70" }, undefined);
    expect(t.onset).toBeDefined();
    expect(t.total).toBeUndefined();
    expect(t.peak_estimate).toBeUndefined();
  });
});

describe("formatRange", () => {
  test("formats sub-hour ranges in minutes", () => {
    expect(formatRange({ min: 20, max: 70 })).toBe("20-70 min");
  });
  test("formats hour-or-more ranges in hr", () => {
    expect(formatRange({ min: 180, max: 300 })).toBe("3-5 hr");
  });
  test("single value uses min/hr depending on magnitude", () => {
    expect(formatRange({ min: 45, max: 45 })).toBe("45 min");
    expect(formatRange({ min: 90, max: 90 })).toBe("1.5 hr");
    expect(formatRange({ min: 240, max: 240 })).toBe("4 hr");
  });
});
