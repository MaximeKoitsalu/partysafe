import { describe, expect, test } from "bun:test";
import type { LeanDataset, MechanismFile } from "../types.ts";
import {
  type OverrideFile,
  hasCumulativeRisk,
  indexMechanisms,
  pairwiseRisksFor,
} from "../lib/combo.ts";
import { asSlug } from "../lib/synonyms.ts";

const dataset: LeanDataset = {
  mdma: {
    name: "mdma",
    pretty_name: "MDMA",
    aliases: [],
    categories: ["stimulant", "empathogen"],
    combos: {
      ketamine: { status: "Caution", note: "stimulant masks dissociative" },
      alcohol: { status: "Caution", note: "MDMA + alcohol" },
      heroin: { status: "Dangerous", note: "depressant interaction" },
    },
  },
  ketamine: {
    name: "ketamine",
    pretty_name: "Ketamine",
    aliases: [],
    categories: ["dissociative"],
    combos: {
      mdma: { status: "Caution", note: "stimulant masks dissociative" },
      alcohol: { status: "Unsafe", note: "dissociative + depressant" },
    },
  },
  alcohol: {
    name: "alcohol",
    pretty_name: "Alcohol",
    aliases: [],
    categories: ["depressant"],
    combos: {
      mdma: { status: "Caution", note: "alc + mdma" },
      ketamine: { status: "Unsafe", note: "dissociative + depressant" },
      heroin: { status: "Dangerous", note: "depressant + opioid" },
    },
  },
  heroin: {
    name: "heroin",
    pretty_name: "Heroin",
    aliases: [],
    categories: ["depressant", "opioid"],
    combos: {
      alcohol: { status: "Dangerous", note: "depressant + opioid" },
      mdma: { status: "Dangerous", note: "depressant interaction" },
    },
  },
};

const mechanisms: MechanismFile = {
  schema_version: "1.0.0",
  generated_at: "2026-05-19T00:00:00Z",
  entries: [
    {
      id: "dissociative-stimulant-caution",
      category_pattern: "dissociative+stimulant",
      severity: "Caution",
      locales: {
        en: {
          mechanism_prose: "stimulant masks dissociative",
          warning_signs: ["hot skin"],
          first_aid: ["cool the person", "call 911 if unresponsive"],
        },
      },
      sources: [{ source: "TripSit", url: "https://example.com", accessed_at: "2026-05-19" }],
      reviewed_by: [],
      reviewed_at: "2026-05-19",
    },
    {
      id: "depressant-opioid-dangerous",
      category_pattern: "depressant+opioid",
      severity: "Dangerous",
      locales: {
        en: {
          mechanism_prose: "respiratory depression compounds",
          warning_signs: ["slow breathing"],
          first_aid: ["call 911"],
        },
      },
      sources: [{ source: "CDC", url: "https://example.com", accessed_at: "2026-05-19" }],
      reviewed_by: [],
      reviewed_at: "2026-05-19",
    },
  ],
};

const emptyOverrides: OverrideFile = {
  schema_version: "1.0.0",
  applies_to_upstream_hash: "test-hash",
  overrides: [],
};

describe("pairwiseRisksFor", () => {
  test("two substances → one pair with upstream + mechanism + severity", () => {
    const sel = [asSlug("mdma"), asSlug("ketamine")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs).toHaveLength(1);
    const pair = result.pairs[0]!;
    expect(pair.severity).toBe("Caution");
    expect(pair.upstream_status).toBe("Caution");
    expect(pair.mechanism?.id).toBe("dissociative-stimulant-caution");
    expect(result.worst_case).toBe("Caution");
    expect(result.cumulative_warning).toBe(false);
  });

  test("three substances → three pairs + cumulative warning", () => {
    const sel = [asSlug("mdma"), asSlug("ketamine"), asSlug("alcohol")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs).toHaveLength(3);
    expect(result.cumulative_warning).toBe(true);
    // worst case is Unsafe (ketamine+alcohol)
    expect(result.worst_case).toBe("Unsafe");
  });

  test("four substances → six pairs + cumulative warning + Dangerous worst case", () => {
    const sel = [asSlug("mdma"), asSlug("ketamine"), asSlug("alcohol"), asSlug("heroin")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs).toHaveLength(6);
    expect(result.cumulative_warning).toBe(true);
    expect(result.worst_case).toBe("Dangerous");
  });

  test("mechanism lookup falls back when no entry exists for that pattern+severity", () => {
    // empathogen+stimulant (mdma) + dissociative (ketamine) → dissociative+stimulant
    // exists. But empathogen+dissociative does NOT exist. Verify the lookup
    // picks the matching pattern, not a non-matching one.
    const sel = [asSlug("mdma"), asSlug("ketamine")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs[0]?.mechanism?.category_pattern).toBe("dissociative+stimulant");
  });

  test("no upstream combo → pair still emitted with no severity", () => {
    const sel = [asSlug("ketamine"), asSlug("heroin")]; // no combo in dataset
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0]?.severity).toBeUndefined();
    expect(result.pairs[0]?.upstream_status).toBeUndefined();
  });

  test("single substance → no pairs", () => {
    const sel = [asSlug("mdma")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs).toHaveLength(0);
    expect(result.cumulative_warning).toBe(false);
  });

  test("empty selection → empty analysis", () => {
    const result = pairwiseRisksFor([], { dataset, mechanisms, overrides: emptyOverrides });
    expect(result.pairs).toHaveLength(0);
    expect(result.worst_case).toBeUndefined();
  });
});

describe("hasCumulativeRisk (Eng E30)", () => {
  test("returns true for N >= 3", () => {
    expect(hasCumulativeRisk([asSlug("a"), asSlug("b"), asSlug("c")])).toBe(true);
    expect(hasCumulativeRisk([asSlug("a"), asSlug("b"), asSlug("c"), asSlug("d")])).toBe(true);
  });
  test("returns false for N < 3", () => {
    expect(hasCumulativeRisk([])).toBe(false);
    expect(hasCumulativeRisk([asSlug("a")])).toBe(false);
    expect(hasCumulativeRisk([asSlug("a"), asSlug("b")])).toBe(false);
  });
});

describe("override application", () => {
  test("annotate mode preserves upstream severity + adds annotation", () => {
    const overrides: OverrideFile = {
      schema_version: "1.0.0",
      applies_to_upstream_hash: "test-hash",
      overrides: [
        {
          target: { type: "combo", key: "mdma+ketamine" },
          mode: "annotate",
          payload: { label: "disputed", popover: "PubMed evidence conflicts" },
          justification: {
            source_url: "https://example.com/pubmed",
            summary: "PubMed evidence conflicts",
            added_by: "test",
            added_at: "2026-05-19",
          },
          expires_or_review_by: "2027-05-19",
        },
      ],
    };
    const sel = [asSlug("mdma"), asSlug("ketamine")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides });
    const pair = result.pairs[0]!;
    expect(pair.severity).toBe("Caution"); // unchanged
    expect(pair.override?.mode).toBe("annotate");
    expect(pair.override?.label).toBe("disputed");
  });

  test("replace_severity raises upstream caution → dangerous", () => {
    const overrides: OverrideFile = {
      schema_version: "1.0.0",
      applies_to_upstream_hash: "test-hash",
      overrides: [
        {
          target: { type: "combo", key: "mdma+ketamine" },
          mode: "replace_severity",
          payload: { new_severity: "Dangerous", original_severity: "Caution" },
          justification: {
            source_url: "https://example.com",
            summary: "reclassification",
            added_by: "test",
            added_at: "2026-05-19",
          },
          expires_or_review_by: "2027-05-19",
        },
      ],
    };
    const sel = [asSlug("mdma"), asSlug("ketamine")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides });
    const pair = result.pairs[0]!;
    expect(pair.severity).toBe("Dangerous");
    expect(pair.override?.mode).toBe("replace_severity");
    expect(pair.override?.original_severity).toBe("Caution");
  });

  test("override key is order-insensitive (ketamine+mdma also matches)", () => {
    const overrides: OverrideFile = {
      schema_version: "1.0.0",
      applies_to_upstream_hash: "test-hash",
      overrides: [
        {
          target: { type: "combo", key: "ketamine+mdma" }, // reverse order
          mode: "annotate",
          payload: { label: "test" },
          justification: {
            source_url: "https://example.com",
            summary: "test",
            added_by: "test",
            added_at: "2026-05-19",
          },
          expires_or_review_by: "2027-05-19",
        },
      ],
    };
    const sel = [asSlug("mdma"), asSlug("ketamine")];
    const result = pairwiseRisksFor(sel, { dataset, mechanisms, overrides });
    expect(result.pairs[0]?.override).toBeDefined();
  });
});

describe("indexMechanisms", () => {
  test("builds (pattern|severity) index", () => {
    const idx = indexMechanisms(mechanisms);
    expect(idx.get("dissociative+stimulant|Caution")?.id).toBe("dissociative-stimulant-caution");
    expect(idx.get("depressant+opioid|Dangerous")?.id).toBe("depressant-opioid-dangerous");
    expect(idx.get("nonexistent+pattern|Caution")).toBeUndefined();
  });
});
