import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifeCycleManager } from "../lifecycle";
import { createEvmExtensionsStore } from "./extensions";
import type { EvmExtensionInfo } from "./types";

const lifecycle = new LifeCycleManager();

const setupAutoUpdateStopSpy = vi.hoisted(() => vi.fn());
const setupAutoUpdateSpy = vi.hoisted(() => vi.fn());
vi.mock("@/internal/auto-update", () => ({
  setupAutoUpdate: (fct: (stop: () => void) => void, ...params: unknown[]) => {
    setupAutoUpdateSpy(fct, ...params);
    const handler = () => fct(setupAutoUpdateStopSpy);
    window.addEventListener("focus", handler);
    lifecycle.subscriptions.add(() => {
      window.removeEventListener("focus", handler);
    });
    return { stop: setupAutoUpdateStopSpy };
  },
}));

beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).ethereum = { request: () => {} };
  vi.resetAllMocks();
  setupAutoUpdateStopSpy.mockReset();
  setupAutoUpdateSpy.mockReset();
});

afterEach(() => {
  lifecycle.cleanup();
});

describe("updateExtensions", () => {
  it("should save valid extensions", () => {
    const supported: EvmExtensionInfo = {
      key: "metamask",
      displayName: "Metamask",
      path: "ethereum",
    };
    const store = createEvmExtensionsStore([supported], { lifecycle });
    store.getState().updateExtensions();
    expect(store.getState().installedArr.length).toBe(1);
    expect(store.getState().installedArr.find((ext) => ext.info.key === supported.key)?.info).toBe(
      supported,
    );
    expect(store.getState().installedMap.size).toBe(1);
    expect(store.getState().installedMap.get(supported.key)?.info).toBe(supported);
  });

  it("should extensions that are not installed", () => {
    const supported: EvmExtensionInfo = {
      key: "notFound",
      displayName: "Not found",
      path: "nowhere.to.be.found",
    };
    const store = createEvmExtensionsStore([supported], { lifecycle });
    store.getState().updateExtensions();
    expect(store.getState().installedArr.length).toBe(0);
    expect(store.getState().installedMap.size).toBe(0);
  });

  it("should ignore invalid extensions", () => {
    const supported: EvmExtensionInfo = {
      key: "invalid",
      displayName: "Invalid",
      path: "invalid",
    };
    (window as unknown as Record<string, unknown>).invalid = { invalid: "api" };
    const store = createEvmExtensionsStore([supported], { lifecycle });
    store.getState().updateExtensions();
    expect(store.getState().installedArr.length).toBe(0);
    expect(store.getState().installedMap.size).toBe(0);
    (window as unknown as Record<string, unknown>).invalid = undefined;
  });

  it("should always return the same objects when caching is enabled", () => {
    const supported: EvmExtensionInfo = {
      key: "metamask",
      displayName: "Metamask",
      path: "ethereum",
    };
    const store = createEvmExtensionsStore([supported], { lifecycle });
    store.getState().updateExtensions();
    const fromArr1 = store.getState().installedArr.find((ext) => ext.info === supported);
    expect(fromArr1).not.toBeUndefined();
    const fromMap1 = store.getState().installedMap.get(supported.key);
    expect(fromMap1).not.toBeUndefined();
    expect(fromArr1).toBe(fromMap1);
    store.getState().updateExtensions();
    const fromArr2 = store.getState().installedArr.find((ext) => ext.info === supported);
    expect(fromArr2).not.toBeUndefined();
    expect(fromArr2).toBe(fromArr1);
    const fromMap2 = store.getState().installedMap.get(supported.key);
    expect(fromMap2).not.toBeUndefined();
    expect(fromMap2).toBe(fromMap1);
  });

  it("should always return the new objects when caching is disabled", () => {
    const supported: EvmExtensionInfo = {
      key: "metamask",
      displayName: "Metamask",
      path: "ethereum",
    };
    const store = createEvmExtensionsStore([supported], { lifecycle });
    store.getState().updateExtensions();
    const fromArr1 = store.getState().installedArr.find((ext) => ext.info === supported);
    expect(fromArr1).not.toBeUndefined();
    const fromMap1 = store.getState().installedMap.get(supported.key);
    expect(fromMap1).not.toBeUndefined();
    expect(fromArr1).toBe(fromMap1);
    store.getState().updateExtensions({ caching: false });
    const fromArr2 = store.getState().installedArr.find((ext) => ext.info === supported);
    expect(fromArr2).not.toBeUndefined();
    expect(fromArr2).not.toBe(fromArr1);
    const fromMap2 = store.getState().installedMap.get(supported.key);
    expect(fromMap2).not.toBeUndefined();
    expect(fromMap2).not.toBe(fromMap1);
    expect(fromArr2).toBe(fromMap2);
  });
});

describe("init", () => {
  it("should update extensions", () => {
    const supported: EvmExtensionInfo = {
      key: "metamask",
      displayName: "Metamask",
      path: "ethereum",
    };
    const store = createEvmExtensionsStore([supported], { lifecycle });
    store.init();
    expect(store.getState().installedArr.length).toBe(1);
  });

  it("should setup auto updates", () => {
    const store = createEvmExtensionsStore([], { lifecycle });
    store.init();
    expect(setupAutoUpdateSpy).toHaveBeenCalledOnce();
  });
});

describe("cleanup", () => {
  it("should cleanup the lifecycle", () => {
    vi.spyOn(lifecycle, "cleanup");
    const store = createEvmExtensionsStore([], { lifecycle });
    store.cleanup();
    expect(lifecycle.cleanup).toHaveBeenCalledOnce();
  });
});
