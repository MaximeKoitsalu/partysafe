/**
 * XSS defense regression tests.
 *
 * The locked rule (PLAN.md Eng E13/E15/F11): user input never reaches the DOM
 * via innerHTML. Slugs from the hash route are validated by validateSlug() —
 * the only constructor for the branded SubstanceSlug type. Anything that
 * fails the slug regex is rejected before any rendering happens.
 *
 * These tests exercise the boundary directly so a regression that loosens
 * the slug regex or skips validation gets caught here.
 */
import { describe, expect, test } from "bun:test";
import { parseRoute } from "../router.ts";
import { validateSlug } from "../lib/synonyms.ts";

// Structural threat payloads. The router lowercases (rule 1) and splits on
// commas, so plain-case-different strings like "MDMA" are normalized rather
// than rejected — those are tested in router.test.ts. These are the actual
// attacker shapes: script tags, control bytes, JS/data URI shapes, etc.
const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "javascript:alert(1)",
  "'; DROP TABLE substances; --",
  "\" onerror=\"alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "%3Cscript%3Ealert(1)%3C%2Fscript%3E",
  "${alert(1)}",
  "{{alert(1)}}",
  "../../etc/passwd",
  "mdma\nketamine",
  "mdma\x00ketamine",
  "mdma ketamine",
  "  mdma  ",
];

describe("validateSlug rejects XSS payloads", () => {
  for (const payload of XSS_PAYLOADS) {
    test(`rejects: ${JSON.stringify(payload)}`, () => {
      expect(validateSlug(payload)).toBeUndefined();
    });
  }
});

describe("hash router rejects XSS payloads", () => {
  for (const payload of XSS_PAYLOADS) {
    test(`router rejects ${JSON.stringify(payload)} in combo`, () => {
      // Encode the payload as a hash component, but keep it un-encoded inline
      // so it actually exercises the slug-validation path (not just the URL
      // decoder).
      const r = parseRoute(`#/combo/${payload}`);
      if (r.kind !== "combo") return; // routes that fail to even parse as combo are fine
      // Any "accepted" substance must be a lowercased kebab slug — never the payload.
      for (const slug of r.substances) {
        expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
        expect(slug.toLowerCase()).not.toBe(payload.toLowerCase());
      }
    });
  }
});

describe("validateSlug accepts well-formed slugs", () => {
  for (const slug of ["mdma", "ketamine", "2c-b", "2cb", "n2o", "lsd-25", "ghb"]) {
    test(`accepts ${slug}`, () => {
      expect(validateSlug(slug)).toBe(slug as never);
    });
  }
});
