import { createConfigStore } from "@/lib/main/stores/config";
import { describe, expect, it, vi } from "vitest";
import { setupAutoUpdate } from "./auto-update";
import { LifeCycleManager, SubscriptionManager, type UnsubscribeFct } from "./lifecycle";

describe("setupAutoUpdate", () => {
  it("should run on window focus if enabled in global config", () => {
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval: false });
    configStore.update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(3);
  });

  it("should run on visibility change if enabled in global config", () => {
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval: false });
    configStore.update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("visibilityChange"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("visibilityChange"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("visibilityChange"));
    expect(updateFct).toHaveBeenCalledTimes(3);
  });

  it("should stop running on window focus if disabled in global config", () => {
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval: false });
    configStore.update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    configStore.update({ updateOnWindowFocus: false });
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
  });

  it("should run on specified update intervals", () => {
    vi.useFakeTimers();
    const updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval });
    configStore.update({ updateOnWindowFocus: false });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("should sync update interval with global config", () => {
    vi.useFakeTimers();
    let updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval });
    configStore.update({ updateOnWindowFocus: false });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(1);
    updateInterval = 150;
    configStore.update({ updateInterval });
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(3);
    configStore.update({ updateInterval: false });
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("should never run when document is hidden", () => {
    const originalDocument = document;
    // biome-ignore lint/suspicious/noGlobalAssign: For testing purposes
    document = Object.assign({}, document, { hidden: true });
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval: false });
    configStore.update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(0);
    // biome-ignore lint/suspicious/noGlobalAssign: For testing purposes
    document = originalDocument;
  });

  it("should use last valid config override", () => {
    vi.useFakeTimers();
    const updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval: false });
    configStore.update({ updateOnWindowFocus: false });
    configStore.update({ wallet: { updateInterval, updateOnWindowFocus: false } });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore, "wallet", { updateOnWindowFocus: true });
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    configStore.update({ updateOnWindowFocus: false });
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(updateInterval * 3);
    expect(updateFct).toHaveBeenCalledTimes(6);
    configStore.update({ wallet: { updateInterval: false } });
    vi.advanceTimersByTime(updateInterval * 3);
    expect(updateFct).toHaveBeenCalledTimes(6);
    vi.useRealTimers();
  });

  it("should stop updates when the stop fct is invoked by the update fct", () => {
    vi.useFakeTimers();
    const updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval });
    configStore.update({ updateOnWindowFocus: true });

    let invocationCount = 0;
    let stopped = false;
    const updateFct = vi.fn((stop: () => void) => {
      if (++invocationCount === 2) {
        stop();
        stopped = true;
      }
    });

    const { stop } = setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    expect(updateFct).toHaveBeenLastCalledWith(stop);
    expect(stopped).toBe(false);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    expect(updateFct).toHaveBeenLastCalledWith(stop);
    expect(stopped).toBe(true);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("should stop updates when the stop fct is invoked by the caller", () => {
    vi.useFakeTimers();
    const updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval });
    configStore.update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => 0);
    const { stop } = setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    expect(updateFct).toHaveBeenLastCalledWith(stop);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    expect(updateFct).toHaveBeenLastCalledWith(stop);
    stop();
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("should stop updates when lifecycle is cleaned up", () => {
    vi.useFakeTimers();
    const updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.update({ updateInterval });
    configStore.update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => 0);
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    lifecycle.cleanup();
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
