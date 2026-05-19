/**
 * Runtime data loaders.
 *
 * Per PLAN.md Eng E7: datasets are FETCHED (not import-inlined) so the JS
 * bundle stays small. Vite's `?url` import emits the file as a static asset
 * with a content-hashed name and gives us back the URL — we then fetch it
 * lazily on first use.
 *
 * The HTML shell adds `<link rel="preload" as="fetch">` tags pointing at
 * these URLs so the browser starts the requests in parallel with JS parse.
 * (Wired in M2 when the picker component lands.)
 */

import { validateMechanismFile } from "./SCHEMA.ts";
import type { LeanDataset, MechanismFile, TripSitPin } from "../types.ts";
import type { OverrideFile } from "../lib/combo.ts";

// Vite's `?url` suffix: ship the JSON as a static asset, give us back the URL.
// At build time the URL is content-hashed; in dev it's the source path.
import tripsitUrl from "./tripsit.lean.json?url";
import mechanismsUrl from "./mechanisms.json?url";
import overridesUrl from "./overrides.json?url";
import pinUrl from "./tripsit-pin.json?url";

let _datasetPromise: Promise<LeanDataset> | undefined;
let _mechanismsPromise: Promise<MechanismFile> | undefined;
let _overridesPromise: Promise<OverrideFile> | undefined;
let _pinPromise: Promise<TripSitPin> | undefined;

async function loadJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} fetching ${url}`);
  return (await res.json()) as T;
}

export function loadDataset(): Promise<LeanDataset> {
  if (!_datasetPromise) _datasetPromise = loadJson<LeanDataset>(tripsitUrl, "tripsit.lean");
  return _datasetPromise;
}

export function loadPin(): Promise<TripSitPin> {
  if (!_pinPromise) _pinPromise = loadJson<TripSitPin>(pinUrl, "tripsit-pin");
  return _pinPromise;
}

export function loadOverrides(): Promise<OverrideFile> {
  if (!_overridesPromise) {
    _overridesPromise = loadJson<OverrideFile>(overridesUrl, "overrides");
  }
  return _overridesPromise;
}

export async function loadMechanisms(): Promise<MechanismFile> {
  if (!_mechanismsPromise) {
    _mechanismsPromise = (async () => {
      const raw = await loadJson<unknown>(mechanismsUrl, "mechanisms");
      // Runtime-validate. The build-time validator should have caught issues;
      // this is the belt-and-suspenders fallback for hand-edited deployments.
      const result = validateMechanismFile(raw, { allowUnreviewed: true });
      if (!result.valid) {
        throw new Error(`mechanisms.json failed runtime validation:\n${result.errors.join("\n")}`);
      }
      return result.file;
    })();
  }
  return _mechanismsPromise;
}

/** Convenience: load everything in parallel. */
export async function loadAll(): Promise<{
  dataset: LeanDataset;
  mechanisms: MechanismFile;
  overrides: OverrideFile;
  pin: TripSitPin;
}> {
  const [dataset, mechanisms, overrides, pin] = await Promise.all([
    loadDataset(),
    loadMechanisms(),
    loadOverrides(),
    loadPin(),
  ]);
  return { dataset, mechanisms, overrides, pin };
}

/**
 * Pre-pinned URLs for preload tags in the HTML shell. Components emit
 * these via a Vite plugin in v1.1; for M1 we ship `<link rel="preload">`
 * statically in index.html for the lean dataset.
 */
export const assetUrls = {
  tripsit: tripsitUrl,
  mechanisms: mechanismsUrl,
  overrides: overridesUrl,
  pin: pinUrl,
};
