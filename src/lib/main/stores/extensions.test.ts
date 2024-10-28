import { LifeCycleManager } from "@/internal/lifecycle";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DefaultWalletApi } from "../utils";
import { createConfigStore } from "./config";
import { createExtensionsStore } from "./extensions";

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
  (window as any).cardano = undefined;
  vi.resetAllMocks();
  setupAutoUpdateStopSpy.mockReset();
  setupAutoUpdateSpy.mockReset();
});

afterEach(() => {
  lifecycle.cleanup();
});

describe("update", () => {
  it("should save valid extensions", async () => {
    window.cardano = {
      nami: { apiVersion: "0.1.0" } as DefaultWalletApi,
      unsupported: { apiVersion: "0.1.0" },
      invalid: {},
    };
    const store = createExtensionsStore({ lifecycle });
    await store.getState().update();
    const state = store.getState();
    expect(state.allArr.length).toBe(2);
    expect(state.supportedMap.get("nami")?.defaultApi).not.toBeUndefined();
    expect(state.supportedMap.get("nami")?.defaultApi).toBe(window.cardano.nami);
    expect(state.unsupportedMap.get("unsupported")?.defaultApi).not.toBeUndefined();
    expect(state.unsupportedMap.get("unsupported")?.defaultApi).toBe(window.cardano.unsupported);
  });

  it("should update boolean flags", async () => {
    window.cardano = {};
    const store = createExtensionsStore({ lifecycle });
    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().isFetching).toBe(false);
    const promise = store.getState().update();
    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().isFetching).toBe(true);
    await promise;
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().isFetching).toBe(false);
  });

  it("should handle update errors", async () => {
    window.cardano = {};
    const updateError = new Error("update error");
    const onUpdateError = vi.fn();
    const onExtensionsUpdateError = vi.fn();
    const config = createConfigStore();
    config.getState().update({
      onUpdateError,
      extensions: { onUpdateError: onExtensionsUpdateError },
    });
    const store = createExtensionsStore({
      config,
      lifecycle,
      async getInstalledExtensions() {
        throw updateError;
      },
    });
    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().isFetching).toBe(false);
    const promise = store.getState().update();
    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().isFetching).toBe(true);
    await promise;
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().isFetching).toBe(false);
    expect(onUpdateError).toHaveBeenCalledWith("extensions", updateError);
    expect(onExtensionsUpdateError).toHaveBeenCalledWith(updateError);
  });
});

describe("init", () => {
  it("should update extensions", async () => {
    window.cardano = {
      nami: { apiVersion: "0.1.0" } as DefaultWalletApi,
      unsupported: { apiVersion: "0.1.0" },
      invalid: {},
    };
    const store = createExtensionsStore({ lifecycle });
    await store.init();
    expect(store.getState().allArr.length).toBe(2);
  });

  it("should setup auto updates", async () => {
    window.cardano = {};
    const store = createExtensionsStore({ lifecycle });
    await store.init();
    expect(setupAutoUpdateSpy).toHaveBeenCalledOnce();
  });

  it("should not setup auto updates if signal is aborted", async () => {
    window.cardano = {};
    const store = createExtensionsStore({ lifecycle });
    const promise = store.init();
    lifecycle.cleanup();
    await promise;
    expect(setupAutoUpdateSpy).not.toHaveBeenCalled();
  });
});

describe("cleanup", () => {
  it("should cleanup the lifecycle", () => {
    vi.spyOn(lifecycle, "cleanup");
    const store = createExtensionsStore({ lifecycle });
    store.cleanup();
    expect(lifecycle.cleanup).toHaveBeenCalledOnce();
  });
});
