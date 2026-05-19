import { describe, expect, test } from "bun:test";
import {
  candidatePatterns,
  isCategory,
  patternKey,
  pharmacologicalCategories,
} from "../lib/category-pattern.ts";

describe("isCategory", () => {
  test("accepts vocabulary entries", () => {
    expect(isCategory("stimulant")).toBe(true);
    expect(isCategory("dissociative")).toBe(true);
  });
  test("rejects junk", () => {
    expect(isCategory("super-stim")).toBe(false);
    expect(isCategory(undefined)).toBe(false);
    expect(isCategory("")).toBe(false);
  });
});

describe("pharmacologicalCategories", () => {
  test("filters out collection tags (common, tentative)", () => {
    expect(pharmacologicalCategories(["common", "stimulant", "tentative"])).toEqual(["stimulant"]);
  });
  test("filters out unknown vocab", () => {
    expect(pharmacologicalCategories(["mystery", "depressant"])).toEqual(["depressant"]);
  });
  test("returns empty for all-junk input", () => {
    expect(pharmacologicalCategories(["common", "tentative", "mystery"])).toEqual([]);
  });
});

describe("patternKey", () => {
  test("orders categories lexicographically", () => {
    expect(patternKey("stimulant", "depressant")).toBe("depressant+stimulant");
    expect(patternKey("opioid", "depressant")).toBe("depressant+opioid");
  });
  test("same-category pairs collapse to identical key", () => {
    expect(patternKey("depressant", "depressant")).toBe("depressant+depressant");
  });
});

describe("candidatePatterns", () => {
  test("multi-category substance pairs produce all combinations", () => {
    const stimEmpathogen = ["stimulant", "empathogen"] as const;
    const dissoc = ["dissociative"] as const;
    const patterns = candidatePatterns([...stimEmpathogen], [...dissoc]);
    expect(patterns.sort()).toEqual(["dissociative+empathogen", "dissociative+stimulant"].sort());
  });
  test("same-category substances yield depressant+depressant pattern", () => {
    const patterns = candidatePatterns(["depressant"], ["depressant"]);
    expect(patterns).toEqual(["depressant+depressant"]);
  });
  test("empty inputs produce empty patterns", () => {
    expect(candidatePatterns([], ["stimulant"])).toEqual([]);
  });
});
