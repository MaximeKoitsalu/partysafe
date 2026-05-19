import { describe, expect, test } from "bun:test";
import { rankMatches, score } from "../lib/match.ts";

describe("score", () => {
  test("exact match dominates", () => {
    expect(score("mdma", "mdma")).toBe(1000);
  });
  test("prefix beats substring", () => {
    expect(score("mdma", "md")).toBeGreaterThan(score("dxm", "x"));
  });
  test("shorter haystack beats longer at same kind of match", () => {
    expect(score("lsd", "lsd")).toBeGreaterThan(score("lsd-25 stuff", "lsd"));
  });
  test("non-match returns -1", () => {
    expect(score("mdma", "xyz")).toBe(-1);
  });
  test("empty query yields -1", () => {
    expect(score("anything", "")).toBe(-1);
  });
  test("case-insensitive", () => {
    expect(score("MDMA", "mdma")).toBe(1000);
    expect(score("mdma", "MDMA")).toBe(1000);
  });
});

describe("rankMatches", () => {
  type Item = { name: string };
  const items: Item[] = [
    { name: "mdma" },
    { name: "ecstasy" },
    { name: "molly" },
    { name: "ketamine" },
    { name: "lsd" },
    { name: "alcohol" },
  ];
  test("ranks by descending score", () => {
    const result = rankMatches(items, "m", (i) => i.name);
    expect(result[0]?.item.name).toBe("mdma");
    expect(result.every((m) => m.score >= 0)).toBe(true);
  });
  test("limits result count", () => {
    const result = rankMatches(items, "e", (i) => i.name, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });
  test("empty query returns empty list", () => {
    expect(rankMatches(items, "", (i) => i.name)).toEqual([]);
  });
});
