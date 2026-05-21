/**
 * localStorage helpers — versioned keys, corruption-safe (PLAN.md Eng E27/E28).
 *
 * All keys are versioned so a future content/format change can re-prompt or
 * reset cleanly. Every access is wrapped: private mode, disabled storage, or
 * a quota error must never break the app. Reads of corrupt JSON reset to a
 * safe default rather than throwing.
 *
 * Stored locally only — never sent anywhere (privacy posture, PLAN.md Eng E11).
 */

const DISCLAIMER_KEY = "ps-disclaimer-ack-v1";
const RECENT_KEY = "ps-recent-combos-v1";
const REGION_KEY = "ps-region-override-v1"; // owned by emergency.ts; cleared here too

const DISCLAIMER_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // private mode / quota — ignore
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** True if the disclaimer was acknowledged within the TTL window. */
export function disclaimerAcknowledged(): boolean {
  const raw = safeGet(DISCLAIMER_KEY);
  if (!raw) return false;
  const ts = Number.parseInt(raw, 10);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISCLAIMER_TTL_MS;
}

export function acknowledgeDisclaimer(): void {
  safeSet(DISCLAIMER_KEY, String(Date.now()));
}

/** Recently-viewed combos (last 3), corruption-safe. Each entry is a slug list. */
export function getRecentCombos(): string[][] {
  const raw = safeGet(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => Array.isArray(row) && row.every((s) => typeof s === "string"))
      .slice(0, 3);
  } catch {
    // Corrupt JSON (hand-edited, half-written from another tab) → reset.
    safeRemove(RECENT_KEY);
    return [];
  }
}

export function pushRecentCombo(slugs: string[]): void {
  if (slugs.length < 2) return;
  const key = [...slugs].sort().join(",");
  const existing = getRecentCombos().filter((row) => [...row].sort().join(",") !== key);
  const next = [slugs, ...existing].slice(0, 3);
  safeSet(RECENT_KEY, JSON.stringify(next));
}

/** Clear everything partysafe stores locally (the /about "Clear local data"). */
export function clearAllLocalData(): void {
  safeRemove(DISCLAIMER_KEY);
  safeRemove(RECENT_KEY);
  safeRemove(REGION_KEY);
}

/** Enumerate what's stored, for the privacy disclosure in /about. */
export function storedKeysSummary(): Array<{ key: string; purpose: string }> {
  return [
    { key: DISCLAIMER_KEY, purpose: "Remembers you saw the disclaimer (90-day expiry)." },
    { key: RECENT_KEY, purpose: "Your last 3 combos, for quick re-access. Never leaves your device." },
    { key: REGION_KEY, purpose: "Your chosen region for emergency numbers." },
  ];
}
