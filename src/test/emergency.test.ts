import { describe, expect, test } from "bun:test";
import { detectRegion, primaryHotline, resolveHotlines } from "../lib/emergency.ts";

describe("detectRegion", () => {
  test("en-US → US (911)", () => {
    expect(detectRegion("en-US")).toBe("US");
    expect(primaryHotline("US").tel).toBe("911");
  });
  test("en-GB → GB (999)", () => {
    expect(detectRegion("en-GB")).toBe("GB");
    expect(primaryHotline("GB").tel).toBe("999");
  });
  test("de-DE → EU (112)", () => {
    expect(detectRegion("de-DE")).toBe("EU");
    expect(primaryHotline("EU").tel).toBe("112");
  });
  test("fr-FR → EU (112)", () => {
    expect(detectRegion("fr-FR")).toBe("EU");
  });
  test("pt-BR → PT-BR (192)", () => {
    expect(detectRegion("pt-BR")).toBe("PT-BR");
    expect(primaryHotline("PT-BR").tel).toBe("192");
  });
  test("pt-PT → EU (112)", () => {
    expect(detectRegion("pt-PT")).toBe("EU");
  });
  test("en-AU → AU (000)", () => {
    expect(detectRegion("en-AU")).toBe("AU");
    expect(primaryHotline("AU").tel).toBe("000");
  });
  test("en-NZ → NZ (111)", () => {
    expect(detectRegion("en-NZ")).toBe("NZ");
  });
  test("underscore form normalized", () => {
    expect(detectRegion("en_GB")).toBe("GB");
  });
  test("unknown language falls back to OTHER", () => {
    expect(detectRegion("xx-XX")).toBe("OTHER");
    expect(detectRegion(undefined)).toBe("OTHER");
  });
  test("language-only fallbacks", () => {
    expect(detectRegion("en")).toBe("US"); // default English assumption
    expect(detectRegion("fr")).toBe("EU");
    expect(detectRegion("de")).toBe("EU");
  });
});

describe("resolveHotlines", () => {
  test("US user gets 911 primary + NUA alternate", () => {
    const { primary, alternates } = resolveHotlines("en-US");
    expect(primary.tel).toBe("911");
    expect(alternates.some((h) => h.label.startsWith("Never Use Alone"))).toBe(true);
  });
  test("EU user gets 112 primary + NUA still surfaced", () => {
    const { primary, alternates } = resolveHotlines("de-DE");
    expect(primary.tel).toBe("112");
    // NUA is added as a fallback even for non-US since they answer internationally.
    expect(alternates.some((h) => h.label.startsWith("Never Use Alone"))).toBe(true);
  });
  test("UK user gets 999 primary + Samaritans alternate", () => {
    const { primary, alternates } = resolveHotlines("en-GB");
    expect(primary.tel).toBe("999");
    expect(alternates.some((h) => h.label.startsWith("Samaritans"))).toBe(true);
  });
});
