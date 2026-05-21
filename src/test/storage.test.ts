import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  acknowledgeDisclaimer,
  clearAllLocalData,
  disclaimerAcknowledged,
  getRecentCombos,
  pushRecentCombo,
} from "../lib/storage.ts";

// In-memory localStorage shim (bun test has no DOM storage).
let store: Map<string, string>;
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    store = new Map();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

afterEach(() => {
  clearAllLocalData();
});

describe("disclaimer acknowledgement", () => {
  test("starts unacknowledged", () => {
    expect(disclaimerAcknowledged()).toBe(false);
  });

  test("acknowledged after ack", () => {
    acknowledgeDisclaimer();
    expect(disclaimerAcknowledged()).toBe(true);
  });

  test("expired ack (older than 90 days) is not acknowledged", () => {
    const old = Date.now() - 91 * 24 * 60 * 60 * 1000;
    localStorage.setItem("ps-disclaimer-ack-v1", String(old));
    expect(disclaimerAcknowledged()).toBe(false);
  });

  test("corrupt ack value is not acknowledged", () => {
    localStorage.setItem("ps-disclaimer-ack-v1", "not-a-number");
    expect(disclaimerAcknowledged()).toBe(false);
  });
});

describe("recent combos", () => {
  test("empty initially", () => {
    expect(getRecentCombos()).toEqual([]);
  });

  test("pushes and reads back a combo", () => {
    pushRecentCombo(["mdma", "ketamine"]);
    expect(getRecentCombos()).toEqual([["mdma", "ketamine"]]);
  });

  test("ignores single-substance pushes", () => {
    pushRecentCombo(["mdma"]);
    expect(getRecentCombos()).toEqual([]);
  });

  test("dedupes regardless of order; most recent first", () => {
    pushRecentCombo(["mdma", "ketamine"]);
    pushRecentCombo(["alcohol", "ghb"]);
    pushRecentCombo(["ketamine", "mdma"]); // same as first, different order
    const recents = getRecentCombos();
    expect(recents).toHaveLength(2);
    expect([...recents[0]!].sort()).toEqual(["ketamine", "mdma"]);
  });

  test("caps at 3 entries", () => {
    pushRecentCombo(["a", "b"]);
    pushRecentCombo(["c", "d"]);
    pushRecentCombo(["e", "f"]);
    pushRecentCombo(["g", "h"]);
    expect(getRecentCombos()).toHaveLength(3);
    expect(getRecentCombos()[0]).toEqual(["g", "h"]);
  });

  test("corrupt JSON resets to empty", () => {
    localStorage.setItem("ps-recent-combos-v1", "{not valid json");
    expect(getRecentCombos()).toEqual([]);
  });

  test("non-array JSON resets to empty", () => {
    localStorage.setItem("ps-recent-combos-v1", '{"foo":"bar"}');
    expect(getRecentCombos()).toEqual([]);
  });
});

describe("clearAllLocalData", () => {
  test("clears disclaimer + recents", () => {
    acknowledgeDisclaimer();
    pushRecentCombo(["mdma", "ketamine"]);
    clearAllLocalData();
    expect(disclaimerAcknowledged()).toBe(false);
    expect(getRecentCombos()).toEqual([]);
  });
});
