import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  type DefaultWalletStoreProps,
  WalletStoreManager,
  type WalletStoreManagerConnectOpts,
} from "./wallet-store";
import type { MaybePromise, PartialWithDiscriminant } from "./utils/types";
import {
  LifeCycleManager,
  SubscriptionManager,
  type UnsubscribeFct,
  newInFlightSignal,
  InFlightSignal,
  InFlightManager,
} from "./lifecycle";
import {
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  WeldStorage,
} from "@/lib/main";
import { setupAutoUpdate } from "./auto-update";
import { WalletConfig, createConfigStore } from "@/lib/main/stores/config";
import { STORAGE_KEYS } from "@/lib/server";

vi.mock("./auto-update");
beforeEach(() => {
  vi.resetAllMocks();
});

type Props = DefaultWalletStoreProps;
type State = PartialWithDiscriminant<Props, "isConnected">;

function newState(): State {
  return {
    key: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
  };
}

type ConnectionFct = (
  key: string,
  configOverrides?: WalletStoreManagerConnectOpts,
) => MaybePromise<{
  updateState: () => MaybePromise<void>;
}>;

function newMockStore() {
  let state = newState();
  const set = vi.fn((partial: Partial<State>) => {
    state = { ...state, ...partial } as State;
  });
  const get = vi.fn(() => state);
  return { state, set, get };
}

describe("WalletStoreManager.connect", () => {
  it("should return the connected state", async () => {
    const key = "testkey";
    const connectedState: State = {
      key,
      isConnected: true,
      isConnectingTo: undefined,
      isConnecting: false,
    };
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => ({
      updateState: () => set(connectedState),
    }));
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    expect(mngr.connect(key)).resolves.toStrictEqual(connectedState);
  });

  it("should throw when isConnected is false", async () => {
    const key = "testkey";
    const connectedState: State = {
      key,
      isConnected: false,
      isConnectingTo: undefined,
      isConnecting: false,
    };
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => ({
      updateState: () => set(connectedState),
    }));
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    await expect(() => mngr.connect(key)).rejects.toThrow("Connection failed");
  });

  it("should clear existing lifecycle subscriptions", async () => {
    const subs = new Set<UnsubscribeFct>();
    const lifecycle = new LifeCycleManager(new SubscriptionManager(subs));
    const oldSub = vi.fn(() => {});
    lifecycle.subscriptions.add(oldSub);
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => ({
      updateState: () => set({ isConnected: true }),
    }));
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
      undefined,
      lifecycle,
    );
    await mngr.connect("testkey");
    expect(subs.has(oldSub)).toBe(false);
    expect(oldSub).toHaveBeenCalledOnce();
  });

  it("should set isConnecting and isConnectingTo state", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      expect(get().isConnectingTo).toBe(key);
      expect(get().isConnecting).toBe(true);
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    await mngr.connect(key);
  });

  it("should set isConnecting and isConnectingTo state", async () => {
    vi.useFakeTimers();
    const connectTimeout = 5000;
    const key = "testkey";
    const lifecycle = new LifeCycleManager();
    const signal = lifecycle.inFlight.add();
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      expect(get().isConnectingTo).toBe(key);
      expect(get().isConnecting).toBe(true);
      vi.advanceTimersByTime(connectTimeout);
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    await expect(() => {
      return mngr.connect(key, {
        configOverrides: { connectTimeout },
        signal,
      });
    }).rejects.toThrow(WalletConnectionAbortedError);
    expect(get().isConnectingTo).toBeUndefined();
    expect(get().isConnecting).toBe(false);
    expect(signal.aborted).toBe(true);
    vi.useRealTimers();
  });

  it("should update state once during connection and propagate errors directly", async () => {
    const key = "testkey";
    const updateError = new Error("update error");
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return {
        updateState: () => {
          throw updateError;
        },
      };
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    await expect(() => mngr.connect(key)).rejects.toThrow(updateError);
  });

  it("should fail if signal is aborted during connection", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const signal = newInFlightSignal();
    const createConnection = vi.fn<ConnectionFct>(() => {
      signal.aborted = true;
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    await expect(() => mngr.connect(key, { signal })).rejects.toThrow(WalletConnectionAbortedError);
  });

  it("should setup auto updates", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const lifecycle = new LifeCycleManager();
    const config = createConfigStore();
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
      config,
      lifecycle,
    );
    const configOverrides: Partial<WalletConfig> = { updateOnWindowFocus: false };
    await mngr.connect(key, { configOverrides });
    expect(setupAutoUpdate).toHaveBeenCalledOnce();
    expect(setupAutoUpdate).toHaveBeenLastCalledWith(
      expect.anything(),
      lifecycle,
      config,
      "wallet",
      configOverrides,
    );
  });

  it("should persist connected key upon successful connection", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true, key }) };
    });
    const config = createConfigStore();
    const cookies = new Map<string, string>();
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.getState().update({ storage, enablePersistence: true });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      storageKey,
      config,
    );
    await mngr.connect(key);
    expect(storage.set).toHaveBeenCalledOnce();
    expect(storage.set).toHaveBeenLastCalledWith(STORAGE_KEYS[storageKey], key);
    expect(cookies.get(STORAGE_KEYS[storageKey])).toBe(key);
  });

  it("should not persist connected key when connection fails", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: false, key }) };
    });
    const config = createConfigStore();
    const cookies = new Map<string, string>();
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.getState().update({ storage, enablePersistence: true });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      storageKey,
      config,
    );
    await expect(() => mngr.connect(key)).rejects.toThrow();
    expect(storage.set).not.toHaveBeenCalled();
    expect(cookies.get(STORAGE_KEYS[storageKey])).toBeUndefined();
  });

  it("should not persist connected key when persistence is disabled", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true, key }) };
    });
    const config = createConfigStore();
    const cookies = new Map<string, string>();
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.getState().update({ storage, enablePersistence: false });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      storageKey,
      config,
    );
    await mngr.connect(key);
    expect(storage.set).not.toHaveBeenCalled();
    expect(cookies.get(STORAGE_KEYS[storageKey])).toBeUndefined();
  });

  it("should remove signal after success", async () => {
    const key = "testkey";
    const inFlight = new Set<InFlightSignal>();
    const lifecycle = new LifeCycleManager(undefined, new InFlightManager(inFlight));
    const signal = lifecycle.inFlight.add();
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true, key }) };
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
      undefined,
      lifecycle,
    );
    expect(inFlight.has(signal)).toBe(true);
    await mngr.connect(key, { signal });
    expect(inFlight.has(signal)).toBe(false);
  });

  it("should remove signal after error", async () => {
    const key = "testkey";
    const inFlight = new Set<InFlightSignal>();
    const lifecycle = new LifeCycleManager(undefined, new InFlightManager(inFlight));
    const signal = lifecycle.inFlight.add();
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      console.log("connecting");
      return { updateState: () => set({ isConnected: false, key }) };
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
      undefined,
      lifecycle,
    );
    expect(inFlight.has(signal)).toBe(true);
    await expect(() => mngr.connect(key, { signal })).rejects.toThrow();
    expect(inFlight.has(signal)).toBe(false);
  });

  it("should disconnect when disconnect account error is thrown", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      throw new WalletDisconnectAccountError();
    });
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    vi.spyOn(mngr, "disconnect");
    await expect(() => mngr.connect(key)).rejects.toThrow();
    expect(mngr.disconnect).toHaveBeenCalledOnce();
  });

  it("should cancel timeout upon success", async () => {
    vi.useFakeTimers();
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const signal = newInFlightSignal();
    const mngr = new WalletStoreManager<State>(
      set,
      get,
      newState,
      createConnection,
      "connectedWallet",
    );
    const connectTimeout = 5000;
    expect(signal.aborted).toBe(false);
    await mngr.connect(key, { signal, configOverrides: { connectTimeout } });
    vi.advanceTimersByTime(connectTimeout);
    expect(signal.aborted).toBe(false);
    vi.useRealTimers();
  });
});
