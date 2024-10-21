import { describe, expect, it, vi } from "vitest";
import { setupAutoUpdate } from "./auto-update";
import { LifeCycleManager, SubscriptionManager, type UnsubscribeFct } from "./lifecycle";
import { createConfigStore } from "@/lib/main/stores/config";

describe("setupAutoUpdate", () => {
  it("should run on window focus if enabled in global config", () => {
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.getState().update({ updateInterval: false });
    configStore.getState().update({ updateOnWindowFocus: true });
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
    configStore.getState().update({ updateInterval: false });
    configStore.getState().update({ updateOnWindowFocus: true });
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
    configStore.getState().update({ updateInterval: false });
    configStore.getState().update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    configStore.getState().update({ updateOnWindowFocus: false });
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
    configStore.getState().update({ updateInterval });
    configStore.getState().update({ updateOnWindowFocus: false });
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
    configStore.getState().update({ updateInterval });
    configStore.getState().update({ updateOnWindowFocus: false });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(1);
    updateInterval = 150;
    configStore.getState().update({ updateInterval });
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(3);
    configStore.getState().update({ updateInterval: false });
    vi.advanceTimersByTime(updateInterval);
    expect(updateFct).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("should never run when document is hidden", () => {
    const originalDocument = document;
    document = Object.assign({}, document, { hidden: true });
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.getState().update({ updateInterval: false });
    configStore.getState().update({ updateOnWindowFocus: true });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore);
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(0);
    document = originalDocument;
  });

  it("should use last valid config override", () => {
    vi.useFakeTimers();
    const updateInterval = 5000;
    const configStore = createConfigStore();
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    configStore.getState().update({ updateInterval: false });
    configStore.getState().update({ updateOnWindowFocus: false });
    configStore.getState().update({ wallet: { updateInterval, updateOnWindowFocus: false } });
    const updateFct = vi.fn(() => "a");
    setupAutoUpdate(updateFct, lifecycle, configStore, "wallet", { updateOnWindowFocus: true });
    expect(updateFct).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(1);
    configStore.getState().update({ updateOnWindowFocus: false });
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("focus"));
    expect(updateFct).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(updateInterval * 3);
    expect(updateFct).toHaveBeenCalledTimes(6);
    configStore.getState().update({ wallet: { updateInterval: false } });
    vi.advanceTimersByTime(updateInterval * 3);
    expect(updateFct).toHaveBeenCalledTimes(6);
    vi.useRealTimers();
  });
});
