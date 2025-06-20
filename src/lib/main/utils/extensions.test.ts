import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DefaultWalletApi,
  type EnabledWalletApi,
  type WindowCardano,
  enableWallet,
  getWalletExtensions,
  getWindowCardano,
} from "./extensions";

beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).cardano = undefined;
});

describe("getWindowCardano", () => {
  it("should return the cardano object", async () => {
    const cardano: WindowCardano = {};
    window.cardano = cardano;
    const res = await getWindowCardano();
    expect(res).toBe(cardano);
  });

  it("should return the api specified key", async () => {
    const cardano: WindowCardano = { lace: { apiVersion: "0.1.0" } as DefaultWalletApi };
    window.cardano = cardano;
    const res = await getWindowCardano({ key: "lace" });
    expect(res).not.toBeUndefined();
    expect(res).toBe(cardano.lace);
  });

  it("should not return invalid apis", async () => {
    const cardano: WindowCardano = { lace: {} as DefaultWalletApi };
    window.cardano = cardano;
    const res = await getWindowCardano({ key: "lace", maxRetryCount: 0 });
    expect(res).toBeUndefined();
  });

  it("should retry", async () => {
    vi.useFakeTimers();
    const retryIntervalMs = 1000;
    const maxRetryCount = 5;
    const cardano: WindowCardano = {};
    const promise = getWindowCardano({ retryIntervalMs, maxRetryCount });
    for (let i = 0; i < maxRetryCount; i++) {
      if (i === maxRetryCount - 1) {
        window.cardano = cardano;
      }
      vi.advanceTimersByTime(retryIntervalMs);
    }
    const res = await promise;
    expect(res).toBe(cardano);
    vi.useRealTimers();
  });

  it("should stop retrying eventually", async () => {
    vi.useFakeTimers();
    const retryIntervalMs = 1000;
    const maxRetryCount = 5;
    const promise = getWindowCardano({ retryIntervalMs, maxRetryCount });
    vi.advanceTimersByTime(retryIntervalMs * maxRetryCount);
    const res = await promise;
    expect(res).toBeUndefined();
    vi.useRealTimers();
  });
});

describe("getWalletExtensions", () => {
  it("should return an empty array when window cardano is undefined", async () => {
    const extensions = await getWalletExtensions({ maxRetryCount: 0 });
    expect(extensions.length).toBe(0);
  });

  it("should strip out blacklisted extensions", async () => {
    window.cardano = { lace: { apiVersion: "0.1.0" } as DefaultWalletApi };
    const extensions = await getWalletExtensions({ blacklist: ["lace"] });
    expect(extensions.length).toBe(0);
  });

  it("should strip out invalid extensions", async () => {
    window.cardano = { lace: {} as DefaultWalletApi };
    const extensions = await getWalletExtensions();
    expect(extensions.length).toBe(0);
  });

  it("should return valid extensions", async () => {
    window.cardano = {
      a: { apiVersion: "0.1.0" } as DefaultWalletApi,
      b: { apiVersion: "0.1.0" } as DefaultWalletApi,
    };
    const extensions = await getWalletExtensions();
    expect(extensions.length).toBe(2);
    expect(extensions.find((e) => e.key === "a")?.defaultApi).toBe(window.cardano.a);
    expect(extensions.find((e) => e.key === "b")?.defaultApi).toBe(window.cardano.b);
  });

  it("should return sort extensions", async () => {
    window.cardano = {
      b: { apiVersion: "0.1.0" } as DefaultWalletApi,
      c: { apiVersion: "0.1.0" } as DefaultWalletApi,
      a: { apiVersion: "0.1.0" } as DefaultWalletApi,
    };
    const extensions = await getWalletExtensions();
    expect(extensions.at(0)?.key).toBe("a");
    expect(extensions.at(1)?.key).toBe("b");
    expect(extensions.at(2)?.key).toBe("c");
  });
});

describe("enableWallet", () => {
  it("should return the enabled api", async () => {
    const enabledApi = {};
    const defaultApi = { enable: async () => enabledApi } as DefaultWalletApi;
    const res = await enableWallet(defaultApi);
    expect(res).toBe(enabledApi);
  });

  it("should not retry when enable fails", async () => {
    vi.useFakeTimers();
    const retryIntervalMs = 1000;
    const maxRetryCount = 5;
    let enableCount = 0;
    const defaultApi = {
      async enable(): Promise<EnabledWalletApi> {
        enableCount++;
        throw new Error("not ready");
      },
    } as DefaultWalletApi;
    const promise = enableWallet(defaultApi, { maxRetryCount, retryIntervalMs });
    await vi.advanceTimersByTimeAsync(retryIntervalMs * maxRetryCount);
    const res = await promise;
    expect(res).toBeUndefined();
    expect(enableCount).toBe(1);
    vi.useRealTimers();
  });

  it("should retry when API does not have a 'enable' property", async () => {
    vi.useFakeTimers();
    const enabledApi = {} as EnabledWalletApi;
    async function enable() {
      return enabledApi;
    }
    const retryIntervalMs = 1000;
    const maxRetryCount = 5;
    const defaultApi = {} as DefaultWalletApi;
    const promise = enableWallet(defaultApi, { maxRetryCount, retryIntervalMs });
    await vi.advanceTimersByTimeAsync(retryIntervalMs * (maxRetryCount - 1));
    defaultApi.enable = enable;
    await vi.advanceTimersByTimeAsync(retryIntervalMs);
    const res = await promise;
    expect(res).toBe(enabledApi);
    vi.useRealTimers();
  });

  it("should stop retrying eventually and return undefined", async () => {
    vi.useFakeTimers();
    const retryIntervalMs = 1000;
    const maxRetryCount = 5;
    const defaultApi = {} as DefaultWalletApi;
    const promise = enableWallet(defaultApi, { maxRetryCount, retryIntervalMs });
    await vi.advanceTimersByTimeAsync(retryIntervalMs * maxRetryCount);
    const res = await promise;
    expect(res).toBeUndefined();
    vi.useRealTimers();
  });
});
