/**
 * Hash router with locked normalization rules (PLAN.md Eng E5 / F5 / F11).
 *
 * 12 cases enumerated in PLAN.md "Step 9 — Hash route normalization (locked)":
 *   #/MDMA,KeTaMine        → lowercase canonical
 *   #/combo/mdma,mdma      → dedupe silent
 *   #/combo/                → render picker (route = "")
 *   #/combo/mdma%2Cket     → decode percent-encoding
 *   #/combo/mdma,k,a,b,c   → cap at 4 with warning
 *   #/combo/mdma,xyzzy     → render picker + did-you-mean (resolution deferred to component)
 *   #/combo/<script>...    → reject via branded SubstanceSlug validator (XSS defense)
 *   #/combo/mdma#anchor    → parse only first hash
 *   picker change          → replaceState (don't pollute history)
 *   route navigation       → pushState (back button works)
 *
 * Public API:
 *   parseRoute(hash)        — pure: hash string → ParsedRoute
 *   serializeRoute(route)   — pure: route → hash string
 *   currentRoute()          — reads window.location.hash
 *   navigate(route, opts)   — updates window.location + emits "route-change"
 *   subscribe(handler)      — listens to route-change events
 *
 * All XSS gating is done in parseRoute via validateSlug(). Components receive
 * branded SubstanceSlug[] and never see raw user strings.
 */

import { validateSlug } from "./lib/synonyms.ts";
import type { SubstanceSlug } from "./types.ts";

export const MAX_SUBSTANCES = 4;

export type ParsedRoute =
  | { kind: "home" }
  | { kind: "combo"; substances: SubstanceSlug[]; warnings: RouteWarning[] }
  | { kind: "drug"; substance: SubstanceSlug }
  | { kind: "emergency" }
  | { kind: "about" }
  | { kind: "unknown"; raw: string };

export type RouteWarning =
  | { type: "invalid_slug"; raw: string }
  | { type: "duplicate"; raw: string }
  | { type: "capped"; dropped: string[] };

/** Parse a hash string (with or without leading #) into a normalized route. */
export function parseRoute(hash: string): ParsedRoute {
  // Strip leading "#" then strip any inner anchor (`#/combo/mdma#anchor`).
  let s = hash.startsWith("#") ? hash.slice(1) : hash;
  const innerHash = s.indexOf("#");
  if (innerHash >= 0) s = s.slice(0, innerHash);

  // Strip leading "/" so both "#/combo/x" and "#combo/x" work.
  if (s.startsWith("/")) s = s.slice(1);

  if (s === "" || s === "home") return { kind: "home" };

  const segments = s.split("/").filter((seg) => seg.length > 0);
  if (segments.length === 0) return { kind: "home" };
  const head = segments[0];
  const rest = segments.slice(1);

  if (head === "combo") {
    if (rest.length === 0) return { kind: "combo", substances: [], warnings: [] };
    // Comma-separated list, percent-decoded
    const raw = rest.join("/");
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const warnings: RouteWarning[] = [];
    const seen = new Set<string>();
    const valid: SubstanceSlug[] = [];
    const dropped: string[] = [];
    for (const piece of decoded.split(",")) {
      const trimmed = piece.trim().toLowerCase();
      if (!trimmed) continue;
      const slug = validateSlug(trimmed);
      if (!slug) {
        warnings.push({ type: "invalid_slug", raw: piece });
        continue;
      }
      if (seen.has(slug)) {
        warnings.push({ type: "duplicate", raw: piece });
        continue;
      }
      seen.add(slug);
      if (valid.length < MAX_SUBSTANCES) {
        valid.push(slug);
      } else {
        dropped.push(piece);
      }
    }
    if (dropped.length > 0) warnings.push({ type: "capped", dropped });
    return { kind: "combo", substances: valid, warnings };
  }

  if (head === "drug" && rest.length === 1) {
    const slug = validateSlug(rest[0]!.toLowerCase());
    if (slug) return { kind: "drug", substance: slug };
    return { kind: "unknown", raw: hash };
  }

  if (head === "emergency") return { kind: "emergency" };
  if (head === "about") return { kind: "about" };

  return { kind: "unknown", raw: hash };
}

/** Serialize a route back to a hash string (without the leading "#"). */
export function serializeRoute(route: ParsedRoute): string {
  switch (route.kind) {
    case "home":
      return "/";
    case "combo":
      if (route.substances.length === 0) return "/combo";
      return `/combo/${route.substances.join(",")}`;
    case "drug":
      return `/drug/${route.substance}`;
    case "emergency":
      return "/emergency";
    case "about":
      return "/about";
    case "unknown":
      return "/";
  }
}

export function currentRoute(): ParsedRoute {
  if (typeof window === "undefined") return { kind: "home" };
  return parseRoute(window.location.hash);
}

export type NavigateOptions = {
  /** Use replaceState instead of pushState (no history entry). */
  replace?: boolean;
};

/**
 * Update window.location.hash to a serialized route.
 *
 * Per the locked rules:
 *   - picker change   → replace: true  (don't pollute history)
 *   - route nav       → replace: false (back button works)
 */
export function navigate(route: ParsedRoute, options: NavigateOptions = {}): void {
  if (typeof window === "undefined") return;
  const hash = `#${serializeRoute(route)}`;
  if (window.location.hash === hash) return;
  if (options.replace) {
    window.history.replaceState(null, "", hash);
  } else {
    window.history.pushState(null, "", hash);
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export type RouteSubscriber = (route: ParsedRoute) => void;

/** Subscribe to route changes (both pushState and popstate fire hashchange). */
export function subscribe(handler: RouteSubscriber): () => void {
  if (typeof window === "undefined") return () => undefined;
  const wrapped = () => handler(currentRoute());
  window.addEventListener("hashchange", wrapped);
  return () => window.removeEventListener("hashchange", wrapped);
}
