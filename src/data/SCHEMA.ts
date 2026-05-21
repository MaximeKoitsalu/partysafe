/**
 * mechanisms.json — TypeScript schema (mirrors SCHEMA.md).
 *
 * Importable runtime guards live below the type definitions. The validator
 * script (scripts/validate-mechanisms.ts) and the runtime loader
 * (src/data/load.ts) both reuse `isValidMechanismFile()` so the same checks
 * apply at build time and runtime.
 */

export const MECHANISMS_SCHEMA_VERSION = "1.0.0" as const;

export const SEVERITY_LABELS = [
  "Low Risk & Synergy",
  "Low Risk & No Synergy",
  "Low Risk & Decrease",
  "Caution",
  "Unsafe",
  "Dangerous",
] as const;
export type Severity = (typeof SEVERITY_LABELS)[number];

/**
 * TripSit category vocabulary. Sourced from inspecting `drugs.json` at the
 * pinned commit. `common` and `tentative` are accepted but ignored by
 * pattern-matching (they're collection tags, not pharmacological classes).
 */
export const CATEGORY_VOCABULARY = [
  "barbiturate",
  "benzodiazepine",
  "deliriant",
  "depressant",
  "dissociative",
  "empathogen",
  "habit-forming",
  "inactive",
  "nootropic",
  "opioid",
  "psychedelic",
  "research-chemical",
  "ssri",
  "stimulant",
  "supplement",
] as const;
export type Category = (typeof CATEGORY_VOCABULARY)[number];

export type Citation = {
  source: string;
  url: string;
  accessed_at: string; // ISO8601 date or datetime
};

export type ReviewerRef = {
  id: string;
  name: string;
  credentials: string;
  reviewed_at: string;
  asserts: string;
  url?: string;
};

export type LocalizedContent = {
  mechanism_prose: string;
  warning_signs: string[];
  first_aid: string[];
};

export type Disputed = {
  reason: string;
  source_url: string;
};

export type MechanismEntry = {
  id: string;
  /**
   * Lexicographically ordered pair like `depressant+opioid`. The validator
   * enforces ordering so combo lookup is O(1).
   */
  category_pattern: string;
  severity: Severity;
  /**
   * Optional substance-pair-specific override, e.g. `lsd+mdma`. When set, this
   * entry wins over the generic category_pattern match for that exact pair —
   * used for named festival combos (candyflip, hippie flip, …) that deserve
   * specific content rather than the category-level explanation. Slugs are
   * lexicographically ordered. `category_pattern` + `severity` are still
   * required (they document the entry and feed the validator).
   */
  pair?: string;
  /** Optional slang / common name for a pair entry, e.g. "Candyflip". */
  common_name?: string;
  locales: {
    en: LocalizedContent;
    [locale: string]: LocalizedContent;
  };
  sources: Citation[];
  reviewed_by: ReviewerRef[];
  reviewed_at: string;
  supersedes?: string;
  disputed?: Disputed;
};

export type MechanismFile = {
  schema_version: typeof MECHANISMS_SCHEMA_VERSION;
  generated_at: string;
  entries: MechanismEntry[];
};

/**
 * Result of validating a mechanism file. Either `valid: true` with the parsed
 * file, or `valid: false` with one or more human-readable errors. Used by
 * both the build-time validator and the runtime loader.
 */
export type ValidationResult =
  | { valid: true; file: MechanismFile; warnings: string[] }
  | { valid: false; errors: string[]; warnings: string[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))?$/;
const KEBAB = /^[a-z0-9-]+$/;
const PATTERN = /^[a-z-]+\+[a-z-]+$/; // category names (no digits)
const PAIR_RE = /^[a-z0-9-]+\+[a-z0-9-]+$/; // substance slugs (digits allowed: 2c-b)
const SEVERITY_SET = new Set<string>(SEVERITY_LABELS);

function wordCount(s: string): number {
  return s
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function isLocalizedContent(v: unknown, path: string, errors: string[]): v is LocalizedContent {
  if (!v || typeof v !== "object") {
    errors.push(`${path}: not an object`);
    return false;
  }
  const obj = v as Record<string, unknown>;
  if (typeof obj["mechanism_prose"] !== "string") {
    errors.push(`${path}.mechanism_prose: must be string`);
    return false;
  }
  if (wordCount(obj["mechanism_prose"]) > 80) {
    errors.push(`${path}.mechanism_prose: exceeds 80 words`);
  }
  if (!Array.isArray(obj["warning_signs"])) {
    errors.push(`${path}.warning_signs: must be array`);
    return false;
  }
  if (obj["warning_signs"].length > 5) {
    errors.push(`${path}.warning_signs: more than 5 bullets`);
  }
  if (!Array.isArray(obj["first_aid"])) {
    errors.push(`${path}.first_aid: must be array`);
    return false;
  }
  if (obj["first_aid"].length > 4) {
    errors.push(`${path}.first_aid: more than 4 steps`);
  }
  return true;
}

function isCitation(v: unknown, path: string, errors: string[]): v is Citation {
  if (!v || typeof v !== "object") {
    errors.push(`${path}: not an object`);
    return false;
  }
  const obj = v as Record<string, unknown>;
  if (typeof obj["source"] !== "string" || obj["source"].length === 0) {
    errors.push(`${path}.source: must be non-empty string`);
    return false;
  }
  if (typeof obj["url"] !== "string" || !/^https?:\/\//.test(obj["url"])) {
    errors.push(`${path}.url: must be http(s) URL`);
    return false;
  }
  if (typeof obj["accessed_at"] !== "string" || !ISO_DATE.test(obj["accessed_at"])) {
    errors.push(`${path}.accessed_at: must be ISO8601 date`);
    return false;
  }
  return true;
}

function isReviewerRef(v: unknown, path: string, errors: string[]): v is ReviewerRef {
  if (!v || typeof v !== "object") {
    errors.push(`${path}: not an object`);
    return false;
  }
  const obj = v as Record<string, unknown>;
  for (const field of ["id", "name", "credentials", "reviewed_at", "asserts"] as const) {
    if (typeof obj[field] !== "string" || (obj[field] as string).length === 0) {
      errors.push(`${path}.${field}: must be non-empty string`);
      return false;
    }
  }
  if (!ISO_DATE.test(obj["reviewed_at"] as string)) {
    errors.push(`${path}.reviewed_at: must be ISO8601`);
    return false;
  }
  return true;
}

export type ValidateOptions = {
  /** When true, missing reviewer signoff downgrades to a warning instead of an error. */
  allowUnreviewed?: boolean;
};

/**
 * Validate a parsed mechanism file. Pure: no I/O, returns errors+warnings.
 * Used by both build-time validator and runtime loader.
 */
export function validateMechanismFile(
  data: unknown,
  options: ValidateOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["root: not an object"], warnings };
  }
  const file = data as Record<string, unknown>;

  if (file["schema_version"] !== MECHANISMS_SCHEMA_VERSION) {
    errors.push(
      `schema_version: expected "${MECHANISMS_SCHEMA_VERSION}", got ${JSON.stringify(file["schema_version"])}`,
    );
  }
  if (typeof file["generated_at"] !== "string" || !ISO_DATE.test(file["generated_at"])) {
    errors.push("generated_at: must be ISO8601 date or datetime");
  }
  if (!Array.isArray(file["entries"])) {
    return { valid: false, errors: [...errors, "entries: must be array"], warnings };
  }

  const ids = new Set<string>();
  const patternSeverity = new Set<string>();
  const pairKeys = new Set<string>();
  const entries = file["entries"] as unknown[];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as Record<string, unknown>;
    const p = `entries[${i}]`;
    if (!e || typeof e !== "object") {
      errors.push(`${p}: not an object`);
      continue;
    }
    if (typeof e["id"] !== "string" || !KEBAB.test(e["id"])) {
      errors.push(`${p}.id: must match /^[a-z0-9-]+$/`);
      continue;
    }
    if (ids.has(e["id"])) {
      errors.push(`${p}.id: duplicate "${e["id"]}"`);
    }
    ids.add(e["id"]);

    if (typeof e["category_pattern"] !== "string" || !PATTERN.test(e["category_pattern"])) {
      errors.push(`${p}.category_pattern: must match /^[a-z-]+\\+[a-z-]+$/`);
    } else {
      const [a, b] = e["category_pattern"].split("+") as [string, string];
      if (a > b) {
        errors.push(
          `${p}.category_pattern: categories must be lexicographically ordered (got "${a}+${b}", expected "${b}+${a}")`,
        );
      }
    }

    if (typeof e["severity"] !== "string" || !SEVERITY_SET.has(e["severity"])) {
      errors.push(`${p}.severity: must be one of ${SEVERITY_LABELS.join(", ")}`);
    }

    // Optional pair-specific override (e.g. "lsd+mdma"). Slugs must be
    // lexicographically ordered, same as category_pattern.
    if ("pair" in e) {
      if (typeof e["pair"] !== "string" || !PAIR_RE.test(e["pair"])) {
        errors.push(`${p}.pair: must match /^[a-z0-9-]+\\+[a-z0-9-]+$/`);
      } else {
        const [pa, pb] = e["pair"].split("+") as [string, string];
        if (pa > pb) {
          errors.push(
            `${p}.pair: slugs must be lexicographically ordered (got "${pa}+${pb}", expected "${pb}+${pa}")`,
          );
        }
        if (pairKeys.has(e["pair"])) {
          errors.push(`${p}.pair: duplicate pair "${e["pair"]}" — one entry per pair`);
        }
        pairKeys.add(e["pair"]);
      }
      if ("common_name" in e && typeof e["common_name"] !== "string") {
        errors.push(`${p}.common_name: must be string when present`);
      }
    } else {
      // Generic entries are unique on (category_pattern, severity). Pair entries
      // are exempt — a specific override may share a pattern/severity with the
      // generic entry it overrides.
      const sevKey = `${e["category_pattern"]}|${e["severity"]}`;
      if (patternSeverity.has(sevKey)) {
        errors.push(
          `${p}: duplicate (category_pattern, severity) tuple "${sevKey}" — entries must be unique on this key`,
        );
      }
      patternSeverity.add(sevKey);
    }

    if (!e["locales"] || typeof e["locales"] !== "object") {
      errors.push(`${p}.locales: must be object`);
    } else {
      const locales = e["locales"] as Record<string, unknown>;
      if (!("en" in locales)) {
        errors.push(`${p}.locales.en: required`);
      }
      for (const [loc, content] of Object.entries(locales)) {
        isLocalizedContent(content, `${p}.locales.${loc}`, errors);
      }
    }

    if (!Array.isArray(e["sources"]) || e["sources"].length === 0) {
      errors.push(`${p}.sources: must have at least 1 citation`);
    } else {
      for (let j = 0; j < e["sources"].length; j++) {
        isCitation(e["sources"][j], `${p}.sources[${j}]`, errors);
      }
    }

    if (!Array.isArray(e["reviewed_by"])) {
      errors.push(`${p}.reviewed_by: must be array`);
    } else if (e["reviewed_by"].length === 0) {
      const msg = `${p}.reviewed_by: empty (no clinician signoff)`;
      if (options.allowUnreviewed) warnings.push(msg);
      else errors.push(msg);
    } else {
      for (let j = 0; j < e["reviewed_by"].length; j++) {
        isReviewerRef(e["reviewed_by"][j], `${p}.reviewed_by[${j}]`, errors);
      }
    }

    if (typeof e["reviewed_at"] !== "string" || !ISO_DATE.test(e["reviewed_at"])) {
      errors.push(`${p}.reviewed_at: must be ISO8601 date or datetime`);
    }

    if ("supersedes" in e && typeof e["supersedes"] !== "string") {
      errors.push(`${p}.supersedes: must be string when present`);
    }
  }

  // Pass 2: verify supersedes references exist
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as Record<string, unknown>;
    if (e && typeof e["supersedes"] === "string" && !ids.has(e["supersedes"])) {
      errors.push(`entries[${i}].supersedes: "${e["supersedes"]}" does not exist`);
    }
  }

  // Pass 3: i18n partial-coverage warning
  const localeCoverage = new Map<string, number>();
  for (const e of entries as Record<string, unknown>[]) {
    if (e && typeof e === "object" && e["locales"]) {
      for (const loc of Object.keys(e["locales"] as Record<string, unknown>)) {
        localeCoverage.set(loc, (localeCoverage.get(loc) ?? 0) + 1);
      }
    }
  }
  for (const [loc, count] of localeCoverage) {
    if (loc === "en") continue;
    if (count > 0 && count < entries.length) {
      warnings.push(
        `locale "${loc}": partial coverage (${count}/${entries.length} entries) — contributors should complete or remove`,
      );
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings };
  return { valid: true, file: file as unknown as MechanismFile, warnings };
}
