import { describe, expect, it, vi } from "vitest";
import { SubscriptionManager, type UnsubscribeFct } from "./lifecycle";

describe("SubscriptionManager", () => {
  it("should add subscriptions sequentially", () => {
    const subs = new Set<UnsubscribeFct>();
    const mngr = new SubscriptionManager(subs);
    const fcts = [() => "a", () => "b", () => "c"];
    for (const fct of fcts) {
      mngr.add(fct);
    }
    expect(subs.size).toBe(fcts.length);
    let i = 0;
    for (const sub of subs.values()) {
      expect(sub).toBe(fcts[i++]);
    }
  });

  it("should call the fct and remove the sub when calling the cleanup fct", () => {
    const subs = new Set<UnsubscribeFct>();
    const mngr = new SubscriptionManager(subs);
    const fct = vi.fn(() => "a");
    const unsub = mngr.add(fct);
    expect(fct).not.toHaveBeenCalled();
    expect(subs.size).toBe(1);
    unsub();
    expect(fct).toHaveBeenCalledTimes(1);
    expect(subs.size).toBe(0);
  });

  it("should call and clear all subs when clearAll is called", () => {
    const subs = new Set<UnsubscribeFct>();
    const mngr = new SubscriptionManager(subs);
    const fcts = [vi.fn(() => "a"), vi.fn(() => "b"), vi.fn(() => "c")];
    for (const fct of fcts) {
      mngr.add(fct);
    }
    mngr.clearAll();
    for (const fct of fcts) {
      expect(fct).toHaveBeenCalledTimes(1);
    }
    expect(subs.size).toBe(0);
  });
});

// describe("InFlightManager", () => {
//   expect(true).toBeFalsy();
// });

// describe("LifeCycleManager", () => {
//   expect(true).toBeFalsy();
// });
