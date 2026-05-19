import { describe, expect, test } from "bun:test";
import { MECHANISMS_SCHEMA_VERSION, validateMechanismFile } from "../data/SCHEMA.ts";

function baseEntry(id: string, pattern = "depressant+stimulant", severity = "Caution") {
  return {
    id,
    category_pattern: pattern,
    severity,
    locales: {
      en: {
        mechanism_prose:
          "Twenty five words are needed for the lint floor but the schema validator only enforces the upper bound here so this is fine actually.",
        warning_signs: ["sign"],
        first_aid: ["call 911"],
      },
    },
    sources: [{ source: "TripSit", url: "https://example.com", accessed_at: "2026-05-19" }],
    reviewed_by: [
      {
        id: "dr-test",
        name: "Dr. Test",
        credentials: "test",
        reviewed_at: "2026-05-19",
        asserts: "tested",
      },
    ],
    reviewed_at: "2026-05-19",
  };
}

function baseFile(entries: ReturnType<typeof baseEntry>[]): unknown {
  return {
    schema_version: MECHANISMS_SCHEMA_VERSION,
    generated_at: "2026-05-19T00:00:00Z",
    entries,
  };
}

describe("validateMechanismFile — happy path", () => {
  test("accepts a well-formed file", () => {
    const r = validateMechanismFile(baseFile([baseEntry("test-1")]));
    expect(r.valid).toBe(true);
  });
});

describe("validateMechanismFile — rejects", () => {
  test("wrong schema_version", () => {
    const f = baseFile([baseEntry("test-1")]) as Record<string, unknown>;
    f["schema_version"] = "0.9.0";
    const r = validateMechanismFile(f);
    expect(r.valid).toBe(false);
  });

  test("non-kebab id", () => {
    const e = baseEntry("Bad_ID");
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("duplicate ids", () => {
    const r = validateMechanismFile(baseFile([baseEntry("dup"), baseEntry("dup")]));
    expect(r.valid).toBe(false);
  });

  test("non-lexicographic category_pattern", () => {
    const e = baseEntry("test", "stimulant+depressant"); // wrong order
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("invalid severity", () => {
    const e = baseEntry("test", "depressant+stimulant", "Super Dangerous");
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("missing en locale", () => {
    const e = baseEntry("test");
    (e.locales as Record<string, unknown>)["en"] = undefined as unknown;
    delete (e.locales as Record<string, unknown>)["en"];
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("prose over 80 words", () => {
    const e = baseEntry("test");
    e.locales.en.mechanism_prose = "word ".repeat(85).trim();
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("more than 5 warning signs", () => {
    const e = baseEntry("test");
    e.locales.en.warning_signs = ["a", "b", "c", "d", "e", "f"];
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("more than 4 first-aid steps", () => {
    const e = baseEntry("test");
    e.locales.en.first_aid = ["1", "2", "3", "4", "5"];
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("empty sources", () => {
    const e = baseEntry("test");
    e.sources = [];
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("empty reviewed_by errors in strict mode", () => {
    const e = baseEntry("test");
    e.reviewed_by = [];
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("empty reviewed_by warns in allowUnreviewed mode", () => {
    const e = baseEntry("test");
    e.reviewed_by = [];
    const r = validateMechanismFile(baseFile([e]), { allowUnreviewed: true });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("reviewed_by"))).toBe(true);
  });

  test("supersedes references missing id", () => {
    const e = baseEntry("test");
    (e as Record<string, unknown>)["supersedes"] = "does-not-exist";
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("duplicate (pattern, severity) tuple", () => {
    const a = baseEntry("a");
    const b = baseEntry("b"); // same pattern + severity as a
    const r = validateMechanismFile(baseFile([a, b]));
    expect(r.valid).toBe(false);
  });

  test("malformed ISO date in reviewed_at", () => {
    const e = baseEntry("test");
    e.reviewed_at = "May 19 2026";
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });

  test("non-http source URL", () => {
    const e = baseEntry("test");
    e.sources[0]!.url = "ftp://example.com";
    const r = validateMechanismFile(baseFile([e]));
    expect(r.valid).toBe(false);
  });
});

describe("validateMechanismFile — partial locale coverage warning", () => {
  test("non-en locale on some but not all entries → warning, not error", () => {
    const a = baseEntry("a");
    const b = baseEntry("b", "depressant+opioid");
    (a.locales as Record<string, unknown>)["pt-BR"] = {
      mechanism_prose: a.locales.en.mechanism_prose,
      warning_signs: ["s"],
      first_aid: ["a"],
    };
    const r = validateMechanismFile(baseFile([a, b]));
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("pt-BR"))).toBe(true);
  });
});

describe("validateMechanismFile — actual mechanisms.json", () => {
  test("the committed mechanisms.json is valid (allow unreviewed)", async () => {
    const raw = await Bun.file(`${import.meta.dir}/../data/mechanisms.json`).json();
    const r = validateMechanismFile(raw, { allowUnreviewed: true });
    if (!r.valid) console.error(r.errors);
    expect(r.valid).toBe(true);
  });
});
