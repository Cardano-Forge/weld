import { type Mock, describe, expect, it, vi } from "vitest";
import {
  InFlightManager,
  type InFlightSignal,
  SubscriptionManager,
  type UnsubscribeFct,
  newInFlightSignal,
  LifeCycleManager,
} from "./lifecycle";

describe("SubscriptionManager", () => {
  it("should add subscriptions sequentially", () => {
    const subs = new Set<UnsubscribeFct>();
    const mngr = new SubscriptionManager(subs);
    const fcts: UnsubscribeFct[] = [() => "a", () => "b", () => "c"];
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
    const fct: Mock<UnsubscribeFct> = vi.fn(() => "a");
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
    const fcts: Mock<UnsubscribeFct>[] = [vi.fn(() => "a"), vi.fn(() => "b"), vi.fn(() => "c")];
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

describe("InFlightManager", () => {
  it("should create a signal and return it when add is called without a param", () => {
    const subs = new Set<InFlightSignal>();
    const mngr = new InFlightManager(subs);
    const sig = mngr.add();
    expect(subs.size).toBe(1);
    expect(subs.has(sig)).toBe(true);
  });

  it("should add passed in signals", () => {
    const subs = new Set<InFlightSignal>();
    const mngr = new InFlightManager(subs);
    const sigs: InFlightSignal[] = [
      newInFlightSignal({ aborted: false }),
      newInFlightSignal({ aborted: true }),
    ];
    for (const sig of sigs) {
      mngr.add(sig);
      expect(subs.has(sig)).toBe(true);
    }
    expect(subs.size).toBe(sigs.length);
  });

  it("should unsubscribe signal without aborting them when remove is called", () => {
    const subs = new Set<InFlightSignal>();
    const mngr = new InFlightManager(subs);
    const sig = mngr.add();
    expect(subs.size).toBe(1);
    mngr.remove(sig);
    expect(sig.aborted).toBe(false);
    expect(subs.size).toBe(0);
  });

  it("should abort all subscribed signals and clear subscriptions when abortAll is called", () => {
    const subs = new Set<InFlightSignal>();
    const mngr = new InFlightManager(subs);
    const sigs: InFlightSignal[] = [
      newInFlightSignal({ aborted: true }),
      newInFlightSignal({ aborted: false }),
      newInFlightSignal({ aborted: false }),
    ];
    const removedSig = mngr.add();
    for (const sig of sigs) {
      mngr.add(sig);
    }
    mngr.remove(removedSig);
    mngr.abortAll();
    expect(removedSig.aborted).toBe(false);
    for (const sig of sigs) {
      expect(subs.has(sig)).toBe(false);
      expect(sig.aborted).toBe(true);
    }
    expect(subs.size).toBe(0);
  });
});

describe("LifeCycleManager", () => {
  it("should cleanup subscriptions and in flight signals when cleanup is called", () => {
    const subs = new Set<UnsubscribeFct>();
    const inFlight = new Set<InFlightSignal>();
    const lifecycle = new LifeCycleManager(
      new SubscriptionManager(subs),
      new InFlightManager(inFlight),
    );
    const fcts: Mock<UnsubscribeFct>[] = [vi.fn(() => "a"), vi.fn(() => "b"), vi.fn(() => "c")];
    for (const fct of fcts) {
      lifecycle.subscriptions.add(fct);
    }
    expect(subs.size).toBe(fcts.length);
    const sigs: InFlightSignal[] = [
      newInFlightSignal({ aborted: true }),
      newInFlightSignal({ aborted: false }),
      newInFlightSignal({ aborted: false }),
    ];
    for (const sig of sigs) {
      lifecycle.inFlight.add(sig);
    }
    expect(inFlight.size).toBe(sigs.length);
    lifecycle.cleanup();
    expect(subs.size).toBe(0);
    expect(inFlight.size).toBe(0);
    for (const sub of subs) {
      expect(sub).toHaveBeenCalledTimes(1);
    }
    for (const sig of sigs) {
      expect(sig.aborted).toBe(true);
    }
  });
});
