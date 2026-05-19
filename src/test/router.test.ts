import { describe, expect, test } from "bun:test";
import { parseRoute, serializeRoute } from "../router.ts";

describe("parseRoute — 12 normalization rules (PLAN.md Eng E5)", () => {
  test("home: empty hash", () => {
    expect(parseRoute("")).toEqual({ kind: "home" });
    expect(parseRoute("#")).toEqual({ kind: "home" });
    expect(parseRoute("#/")).toEqual({ kind: "home" });
  });

  test("rule 1: lowercase canonical (MDMA → mdma)", () => {
    // SubstanceSlug validation rejects uppercase but the router lowercases first.
    const r = parseRoute("#/combo/MDMA,KeTaMine");
    expect(r.kind).toBe("combo");
    if (r.kind !== "combo") throw new Error("type guard");
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
    expect(r.warnings).toEqual([]);
  });

  test("rule 2: dedupe silent on identical slugs", () => {
    const r = parseRoute("#/combo/mdma,ketamine,mdma");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]?.type).toBe("duplicate");
  });

  test("rule 3: empty combo path renders empty combo", () => {
    const r = parseRoute("#/combo/");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  test("rule 4: percent-encoded comma decoded", () => {
    const r = parseRoute("#/combo/mdma%2Cketamine");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
  });

  test("rule 5: cap at 4 with capped warning", () => {
    const r = parseRoute("#/combo/mdma,ketamine,alcohol,lsd,heroin");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toHaveLength(4);
    expect(r.warnings.some((w) => w.type === "capped")).toBe(true);
  });

  test("rule 6: invalid slug → warning + still renders other valid", () => {
    const r = parseRoute("#/combo/mdma,XYZ$,ketamine");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
    expect(r.warnings.some((w) => w.type === "invalid_slug")).toBe(true);
  });

  test("rule 7: XSS payload rejected via branded SubstanceSlug", () => {
    const r = parseRoute("#/combo/<script>alert(1)</script>");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual([]);
    expect(r.warnings.some((w) => w.type === "invalid_slug")).toBe(true);
  });

  test("rule 8: parse terminates at inner # (anchor)", () => {
    const r = parseRoute("#/combo/mdma,ketamine#some-anchor");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
  });

  test("rule 9: leading / handled (both #/combo and #combo work)", () => {
    expect(parseRoute("#combo/mdma,ketamine").kind).toBe("combo");
    expect(parseRoute("#/combo/mdma,ketamine").kind).toBe("combo");
  });

  test("rule 10: drug route requires exactly one slug", () => {
    expect(parseRoute("#/drug/mdma")).toEqual({ kind: "drug", substance: "mdma" as never });
    expect(parseRoute("#/drug").kind).toBe("unknown");
  });

  test("rule 11: emergency + about routes", () => {
    expect(parseRoute("#/emergency")).toEqual({ kind: "emergency" });
    expect(parseRoute("#/about")).toEqual({ kind: "about" });
  });

  test("rule 12: unknown routes surface raw hash", () => {
    const r = parseRoute("#/banana");
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") expect(r.raw).toBe("#/banana");
  });
});

describe("parseRoute — edge cases", () => {
  test("trims whitespace inside comma-separated list", () => {
    const r = parseRoute("#/combo/ mdma ,  ketamine ");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
  });

  test("empty pieces between commas ignored silently", () => {
    const r = parseRoute("#/combo/mdma,,,ketamine");
    if (r.kind !== "combo") throw new Error();
    expect(r.substances).toEqual(["mdma", "ketamine"] as typeof r.substances);
    expect(r.warnings.filter((w) => w.type === "invalid_slug")).toEqual([]);
  });

  test("malformed percent-encoding falls through gracefully", () => {
    // %ZZ is invalid; decodeURIComponent throws; we fall back to the raw string,
    // which has '%' chars in pieces — those fail validateSlug and become warnings.
    const r = parseRoute("#/combo/mdma%ZZ");
    expect(r.kind).toBe("combo");
  });

  test("drug route rejects bad slug", () => {
    expect(parseRoute("#/drug/<script>").kind).toBe("unknown");
  });
});

describe("serializeRoute round-trip", () => {
  test("home → /", () => {
    expect(serializeRoute({ kind: "home" })).toBe("/");
  });
  test("combo with substances", () => {
    expect(
      serializeRoute({
        kind: "combo",
        substances: ["mdma" as never, "ketamine" as never],
        warnings: [],
      }),
    ).toBe("/combo/mdma,ketamine");
  });
  test("empty combo", () => {
    expect(serializeRoute({ kind: "combo", substances: [], warnings: [] })).toBe("/combo");
  });
  test("drug + emergency + about", () => {
    expect(serializeRoute({ kind: "drug", substance: "mdma" as never })).toBe("/drug/mdma");
    expect(serializeRoute({ kind: "emergency" })).toBe("/emergency");
    expect(serializeRoute({ kind: "about" })).toBe("/about");
  });
});
