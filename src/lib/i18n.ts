/**
 * Locale resolution with fallback chain.
 *
 * Rules (PLAN.md Eng E3):
 *  - `en` is required on every mechanism entry (validator enforces this).
 *  - Other locales are optional, per-entry.
 *  - Fallback chain: requested → language-only → "en".
 *    Example: "pt-BR" → "pt" → "en".
 *
 * v1 ships hardcoded en (no locale switcher in UI). The architecture is
 * locale-aware so future translation contributions don't require retrofit.
 */

import type { LocalizedContent, MechanismEntry } from "../types.ts";

export type LocaleCode = string; // BCP-47-ish; we don't enforce strict parsing

export function fallbackChain(requested: LocaleCode): LocaleCode[] {
  const out: LocaleCode[] = [];
  const norm = requested.replace(/_/g, "-");
  out.push(norm);
  const lang = norm.split("-")[0];
  if (lang && lang !== norm) out.push(lang);
  if (!out.includes("en")) out.push("en");
  return out;
}

/**
 * Resolve a mechanism entry's localized content for a requested locale,
 * walking the fallback chain. Returns the chosen locale alongside content.
 * If `en` is missing this throws — the validator should have caught it,
 * so we treat the runtime occurrence as a programmer error.
 */
export function resolveLocale(
  entry: MechanismEntry,
  requested: LocaleCode,
): { locale: LocaleCode; content: LocalizedContent } {
  for (const candidate of fallbackChain(requested)) {
    const content = entry.locales[candidate];
    if (content) return { locale: candidate, content };
  }
  // The validator forbids missing `en`. If we land here something corrupted.
  throw new Error(
    `i18n: entry ${entry.id} has no resolvable locale for "${requested}" (and no en fallback)`,
  );
}
