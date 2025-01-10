import { LifeCycleManager } from "@/internal/lifecycle";
import { identity } from "@/internal/utils/identity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_BTC_WALLETS } from "../handlers";
import type { BtcWalletDef } from "../types";
import { createBtcExtensionsStore } from "./extensions";

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
  (window as any).unisat = { request: identity };
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).XverseProviders = { BitcoinProvider: { request: identity } };
  vi.resetAllMocks();
  setupAutoUpdateStopSpy.mockReset();
  setupAutoUpdateSpy.mockReset();
});

afterEach(() => {
  lifecycle.cleanup();
});

describe("updateExtensions", () => {
  it("should save valid extensions", () => {
    const supported = SUPPORTED_BTC_WALLETS.unisat;
    const store = createBtcExtensionsStore({ lifecycle, supportedExtensions: [supported] });
    store.updateExtensions();
    expect(store.installedArr.length).toBe(1);
    expect(store.installedMap.size).toBe(1);
    expect(store.installedArr.find((ext) => ext.key === supported.key)?.info).toBe(supported.info);
    expect(store.installedMap.get(supported.key)?.info).toBe(supported.info);
  });

  it("should ignore extensions that are not installed", () => {
    const supported = {
      key: "notFound",
      info: {
        id: "nowhere.to.be.found",
        name: "Not Found",
        icon: "noicon",
      },
    } as BtcWalletDef;
    const supportedExtensions = [supported];
    const store = createBtcExtensionsStore({ supportedExtensions, lifecycle });
    store.updateExtensions();
    expect(store.installedArr.length).toBe(0);
    expect(store.installedMap.size).toBe(0);
  });

  it("should always return the same objects when caching is enabled", () => {
    const supported: BtcWalletDef = SUPPORTED_BTC_WALLETS.unisat;
    const store = createBtcExtensionsStore({ supportedExtensions: [supported], lifecycle });
    store.updateExtensions();
    const fromArr1 = store.installedArr.find((ext) => ext.info === supported.info);
    expect(fromArr1).not.toBeUndefined();
    const fromMap1 = store.installedMap.get(supported.key);
    expect(fromMap1).not.toBeUndefined();
    expect(fromArr1).toBe(fromMap1);
    store.updateExtensions();
    const fromArr2 = store.installedArr.find((ext) => ext.info === supported.info);
    expect(fromArr2).not.toBeUndefined();
    expect(fromArr2).toBe(fromArr1);
    const fromMap2 = store.installedMap.get(supported.key);
    expect(fromMap2).not.toBeUndefined();
    expect(fromMap2).toBe(fromMap1);
  });

  it("should always return the new objects when caching is disabled", () => {
    const supported: BtcWalletDef = SUPPORTED_BTC_WALLETS.unisat;
    const store = createBtcExtensionsStore({ supportedExtensions: [supported], lifecycle });
    store.updateExtensions();
    const fromArr1 = store.installedArr.find((ext) => ext.info === supported.info);
    expect(fromArr1).not.toBeUndefined();
    const fromMap1 = store.installedMap.get(supported.key);
    expect(fromMap1).not.toBeUndefined();
    expect(fromArr1).toBe(fromMap1);
    store.updateExtensions({ caching: false });
    const fromArr2 = store.installedArr.find((ext) => ext.info === supported.info);
    expect(fromArr2).not.toBeUndefined();
    expect(fromArr2).not.toBe(fromArr1);
    const fromMap2 = store.installedMap.get(supported.key);
    expect(fromMap2).not.toBeUndefined();
    expect(fromMap2).not.toBe(fromMap1);
    expect(fromArr2).toBe(fromMap2);
  });
});

describe("init", () => {
  it("should update extensions", () => {
    const supported: BtcWalletDef = SUPPORTED_BTC_WALLETS.unisat;
    const store = createBtcExtensionsStore({ supportedExtensions: [supported], lifecycle });
    store.init();
    expect(store.installedArr.length).toBe(1);
  });

  it("should setup auto updates", () => {
    const store = createBtcExtensionsStore({ lifecycle });
    store.init();
    expect(setupAutoUpdateSpy).toHaveBeenCalledOnce();
  });
});

describe("cleanup", () => {
  it("should cleanup the lifecycle", () => {
    vi.spyOn(lifecycle, "cleanup");
    const store = createBtcExtensionsStore({ lifecycle });
    store.cleanup();
    expect(lifecycle.cleanup).toHaveBeenCalledOnce();
  });
});
