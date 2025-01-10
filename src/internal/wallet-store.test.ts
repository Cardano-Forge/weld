import {
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WeldStorage,
} from "@/lib/main";
import { type WalletConfig, createConfigStore } from "@/lib/main/stores/config";
import { STORAGE_KEYS } from "@/lib/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InFlightManager,
  type InFlightSignal,
  LifeCycleManager,
  SubscriptionManager,
  type UnsubscribeFct,
} from "./lifecycle";
import type { MaybePromise, PartialWithDiscriminant } from "./utils/types";
import {
  type DefaultWalletStoreProps,
  WalletStoreManager,
  type WalletStoreManagerConnectOpts,
  newWalletStoreManagerSubscriptions,
} from "./wallet-store";

const subs = new Set<UnsubscribeFct>();
const inFlight = new Set<InFlightSignal>();
const lifecycle = new LifeCycleManager(
  new SubscriptionManager(subs),
  new InFlightManager(inFlight),
);

const setupAutoUpdateStopSpy = vi.hoisted(() => vi.fn());
const setupAutoUpdateSpy = vi.hoisted(() => vi.fn());
vi.mock("./auto-update", () => ({
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
  vi.resetAllMocks();
  setupAutoUpdateStopSpy.mockReset();
  setupAutoUpdateSpy.mockReset();
});

afterEach(() => {
  lifecycle.cleanup();
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
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
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
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    await expect(() => mngr.connect(key)).rejects.toThrow("Connection failed");
  });

  it("should clear existing lifecycle subscriptions", async () => {
    const oldSub = vi.fn(() => {});
    lifecycle.subscriptions.add(oldSub);
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => ({
      updateState: () => set({ isConnected: true }),
    }));
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    await mngr.connect("testkey");
    expect(subs.has(oldSub)).toBe(false);
    expect(oldSub).toHaveBeenCalledOnce();
  });

  it("should keep the last initiated connection and not the last resolved", async () => {
    vi.useFakeTimers();
    const { set, get } = newMockStore();
    let createCount = 0;
    const timeout = 500;
    const createConnection = vi.fn<ConnectionFct>(async (key) => {
      await new Promise((r) => setTimeout(r, timeout * ++createCount));
      return { updateState: () => set({ isConnected: true, key }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    const promise = Promise.allSettled([
      mngr.connect("key1"),
      mngr.connect("key2"),
      mngr.connect("key3"),
    ]);
    vi.advanceTimersByTime(timeout * createCount);
    await promise;
    expect(get().key).toBe("key3");
    vi.useRealTimers();
  });

  it("should set isConnecting and isConnectingTo state", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      expect(get().isConnectingTo).toBe(key);
      expect(get().isConnecting).toBe(true);
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    await mngr.connect(key);
  });

  it("should set isConnecting and isConnectingTo state", async () => {
    vi.useFakeTimers();
    const connectTimeout = 5000;
    const key = "testkey";
    const signal = lifecycle.inFlight.add();
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      expect(get().isConnectingTo).toBe(key);
      expect(get().isConnecting).toBe(true);
      vi.advanceTimersByTime(connectTimeout);
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
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
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    await expect(() => mngr.connect(key)).rejects.toThrow(updateError);
  });

  it("should fail if signal is aborted during connection", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const signal = lifecycle.inFlight.add();
    const createConnection = vi.fn<ConnectionFct>(() => {
      signal.aborted = true;
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    await expect(() => mngr.connect(key, { signal })).rejects.toThrow(WalletConnectionAbortedError);
  });

  it("should setup auto updates", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const config = createConfigStore();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      configStore: config,
      lifecycle,
    });
    const configOverrides: Partial<WalletConfig> = { updateOnWindowFocus: false };
    await mngr.connect(key, { configOverrides });
    expect(setupAutoUpdateSpy).toHaveBeenCalledOnce();
    expect(setupAutoUpdateSpy).toHaveBeenLastCalledWith(
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
    config.update({ storage, enablePersistence: true });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
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
    config.update({ storage, enablePersistence: true });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
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
    config.update({ storage, enablePersistence: false });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
    await mngr.connect(key);
    expect(storage.set).not.toHaveBeenCalled();
    expect(cookies.get(STORAGE_KEYS[storageKey])).toBeUndefined();
  });

  it("should remove signal after success", async () => {
    const key = "testkey";
    const signal = lifecycle.inFlight.add();
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true, key }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(inFlight.has(signal)).toBe(true);
    await mngr.connect(key, { signal });
    expect(inFlight.has(signal)).toBe(false);
  });

  it("should remove signal after error", async () => {
    const key = "testkey";
    const signal = lifecycle.inFlight.add();
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: false, key }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
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
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
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
    const signal = lifecycle.inFlight.add();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    const connectTimeout = 5000;
    expect(signal.aborted).toBe(false);
    await mngr.connect(key, { signal, configOverrides: { connectTimeout } });
    vi.advanceTimersByTime(connectTimeout);
    expect(signal.aborted).toBe(false);
    vi.useRealTimers();
  });

  it("should stop updates when signal is aborted after connection", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const signal = lifecycle.inFlight.add();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(signal.aborted).toBe(false);
    await mngr.connect(key, { signal });
    expect(updateState).toHaveBeenCalledOnce();
    expect(setupAutoUpdateSpy).toHaveBeenCalledOnce();
    expect(setupAutoUpdateStopSpy).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    expect(updateState).toHaveBeenCalledTimes(2);
    expect(setupAutoUpdateStopSpy).not.toHaveBeenCalled();
    signal.aborted = true;
    window.dispatchEvent(new Event("focus"));
    expect(updateState).toHaveBeenCalledTimes(2);
    expect(setupAutoUpdateStopSpy).toHaveBeenCalledOnce();
  });

  it("should trigger disconnect on auto update failure", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    let callCount = 0;
    const updateState = vi.fn(() => {
      if (++callCount > 2) {
        throw new Error("Can only auto update once");
      }
      set({ isConnected: true });
    });
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const signal = lifecycle.inFlight.add();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    vi.spyOn(mngr, "disconnect");
    await mngr.connect(key, { signal });
    expect(mngr.disconnect).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    expect(mngr.disconnect).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    expect(mngr.disconnect).toHaveBeenCalledOnce();
  });

  it("should handle update errors", async () => {
    const key = "testkey";
    const { set, get } = newMockStore();
    let callCount = 0;
    const updateState = vi.fn(() => {
      if (++callCount > 2) {
        throw new Error("Can only auto update once");
      }
      set({ isConnected: true });
    });
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const signal = lifecycle.inFlight.add();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    vi.spyOn(mngr, "handleUpdateError");
    await mngr.connect(key, { signal });
    expect(mngr.handleUpdateError).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    expect(mngr.handleUpdateError).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    expect(mngr.handleUpdateError).toHaveBeenCalledOnce();
  });
});

describe("WalletStoreManager.on", () => {
  it("should add subscriptions", () => {
    const { set, get } = newMockStore();
    const subscriptions = newWalletStoreManagerSubscriptions();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
      subscriptions,
    });
    const onUpdateError1 = () => {};
    mngr.on("updateError", onUpdateError1);
    const onUpdateError2 = () => {};
    mngr.on("updateError", onUpdateError2);
    const onBeforeDisconnect1 = () => {};
    mngr.on("beforeDisconnect", onBeforeDisconnect1);
    const onBeforeDisconnect2 = () => {};
    mngr.on("beforeDisconnect", onBeforeDisconnect2);
    const onAfterDisconnect1 = () => {};
    mngr.on("afterDisconnect", onAfterDisconnect1);
    const onAfterDisconnect2 = () => {};
    mngr.on("afterDisconnect", onAfterDisconnect2);
    expect(subscriptions.updateError.size).toBe(2);
    expect(subscriptions.updateError.has(onUpdateError1)).toBe(true);
    expect(subscriptions.updateError.has(onUpdateError2)).toBe(true);
    expect(subscriptions.beforeDisconnect.size).toBe(2);
    expect(subscriptions.beforeDisconnect.has(onBeforeDisconnect1)).toBe(true);
    expect(subscriptions.beforeDisconnect.has(onBeforeDisconnect2)).toBe(true);
    expect(subscriptions.afterDisconnect.size).toBe(2);
    expect(subscriptions.afterDisconnect.has(onAfterDisconnect1)).toBe(true);
    expect(subscriptions.afterDisconnect.has(onAfterDisconnect2)).toBe(true);
  });
});

describe("WalletStoreManager.handleUpdateError", () => {
  it("should run the config's error handlers", async () => {
    const { set, get } = newMockStore();
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const config = createConfigStore();
    const onUpdateError = vi.fn();
    const onWalletUpdateError = vi.fn();
    config.update({
      onUpdateError,
      wallet: { onUpdateError: onWalletUpdateError },
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      configStore: config,
      lifecycle,
    });
    const error = new Error();
    expect(onUpdateError).not.toHaveBeenCalled();
    expect(onWalletUpdateError).not.toHaveBeenCalled();
    mngr.handleUpdateError(error);
    expect(onUpdateError).toHaveBeenCalledOnce();
    expect(onWalletUpdateError).toHaveBeenCalledOnce();
  });

  it("should run the update error subscriptions", async () => {
    const { set, get } = newMockStore();
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const onUpdateError1 = vi.fn();
    const onUpdateError2 = vi.fn();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    })
      .on("updateError", onUpdateError1)
      .on("updateError", onUpdateError2);
    const error = new Error();
    expect(onUpdateError1).not.toHaveBeenCalled();
    expect(onUpdateError2).not.toHaveBeenCalled();
    await mngr.handleUpdateError(error);
    expect(onUpdateError1).toHaveBeenCalledOnce();
    expect(onUpdateError2).toHaveBeenCalledOnce();
  });
});

describe("WalletStoreManager.cleanup", () => {
  it("should cleanup the lifecycle manager", () => {
    vi.spyOn(lifecycle, "cleanup");
    const { set, get } = newMockStore();
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(lifecycle.cleanup).not.toHaveBeenCalled();
    mngr.cleanup();
    expect(lifecycle.cleanup).toHaveBeenCalledOnce();
  });
});

describe("WalletStoreManager.persist", () => {
  it("should update the initialState object to reflect persisted data", async () => {
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const config = createConfigStore();
    const cookies = new Map<string, string>();
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.update({ storage, enablePersistence: true });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
    const initialState = newState();
    mngr.persist({ initialState }, { tryToReconnectTo: undefined });
    expect(initialState.isConnectingTo).toBeUndefined();
    expect(initialState.isConnecting).toBe(false);
    const tryToReconnectTo = "testWallet";
    mngr.persist({ initialState }, { tryToReconnectTo });
    expect(initialState.isConnectingTo).toBe(tryToReconnectTo);
    expect(initialState.isConnecting).toBe(true);
  });

  it("should update the store state to reflect persisted data", async () => {
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const config = createConfigStore();
    const cookies = new Map<string, string>();
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.update({ storage, enablePersistence: true });
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
    const initialState = newState();
    mngr.persist({ initialState }, { tryToReconnectTo: undefined });
    expect(get().isConnectingTo).toBeUndefined();
    expect(get().isConnecting).toBe(false);
    const tryToReconnectTo = "testWallet";
    mngr.persist({ initialState }, { tryToReconnectTo });
    expect(get().isConnectingTo).toBe(tryToReconnectTo);
    expect(get().isConnecting).toBe(true);
  });

  it("should try to retrieve persist data from storage on the client", async () => {
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState: () => set({ isConnected: true }) };
    });
    const clientKey = "walletclient";
    const config = createConfigStore();
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const cookies = new Map<string, string>([[STORAGE_KEYS[storageKey], clientKey]]);
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.update({ storage, enablePersistence: true });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
    const windowObj = window;
    // biome-ignore lint/suspicious/noGlobalAssign: For testing purposes
    window = undefined as unknown as typeof window;
    const initialState = newState();
    mngr.persist({ initialState }, { tryToReconnectTo: undefined });
    expect(get().isConnectingTo).toBeUndefined();
    expect(get().isConnecting).toBe(false);
    // biome-ignore lint/suspicious/noGlobalAssign: For testing purposes
    window = windowObj;
    config.update({ enablePersistence: false });
    mngr.persist({ initialState }, { tryToReconnectTo: undefined });
    expect(get().isConnectingTo).toBeUndefined();
    expect(get().isConnecting).toBe(false);
    config.update({ enablePersistence: true });
    const tryToReconnectTo = "serverwallet";
    mngr.persist({ initialState }, { tryToReconnectTo });
    expect(get().isConnectingTo).toBe(tryToReconnectTo);
    expect(get().isConnecting).toBe(true);
    mngr.persist({ initialState }, { tryToReconnectTo: undefined });
    expect(get().isConnectingTo).toBe(clientKey);
    expect(get().isConnecting).toBe(true);
  });
});

describe("WalletStoreManager.init", () => {
  it("should connect initial wallet", async () => {
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
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(get()).toStrictEqual(newState());
    await mngr.init({ initialState: newState() });
    expect(get()).toStrictEqual(newState());
    await mngr.init({
      initialState: {
        ...newState(),
        isConnecting: true,
        isConnectingTo: key,
      },
    });
    expect(get()).toStrictEqual(connectedState);
  });

  it("should catch connection errors", async () => {
    const { set, get } = newMockStore();
    const createConnection = vi.fn<ConnectionFct>(() => {
      throw new Error("connection failed");
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(get()).toStrictEqual(newState());
    expect(mngr.init({ initialState: newState() })).resolves.not.toThrow();
    expect(get()).toStrictEqual(newState());
  });
});

describe("WalletStoreManager.disconnect", () => {
  it("should cleanup the lifecycle", async () => {
    vi.spyOn(lifecycle, "cleanup");
    const { set, get } = newMockStore();
    set({
      isConnected: true,
      key: "mykey",
      isConnectingTo: "mykey",
      isConnecting: true,
    });
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(lifecycle.cleanup).not.toHaveBeenCalled();
    mngr.cleanup();
    expect(lifecycle.cleanup).toHaveBeenCalledOnce();
  });

  it("should reset the state", async () => {
    vi.spyOn(lifecycle, "cleanup");
    const { set, get } = newMockStore();
    const updatedState: State = {
      isConnected: true,
      key: "mykey",
      isConnectingTo: "mykey",
      isConnecting: true,
    };
    set(updatedState);
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    });
    expect(get()).toStrictEqual(updatedState);
    await mngr.disconnect();
    expect(get()).toStrictEqual(newState());
  });

  it("should run subscriptions", async () => {
    vi.spyOn(lifecycle, "cleanup");
    const { set, get } = newMockStore();
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const onBeforeDisconnect = vi.fn();
    const onAfterDisconnect = vi.fn();
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: "connectedWallet",
      lifecycle,
    })
      .on("beforeDisconnect", onBeforeDisconnect)
      .on("afterDisconnect", onAfterDisconnect);
    expect(onBeforeDisconnect).not.toHaveBeenCalled();
    expect(onAfterDisconnect).not.toHaveBeenCalled();
    await mngr.disconnect();
    expect(onBeforeDisconnect).toHaveBeenCalledOnce();
    expect(onAfterDisconnect).toHaveBeenCalledOnce();
  });

  it("should remove storage key when persistence is enabled", async () => {
    const key = "testkey";
    const storageKey: keyof typeof STORAGE_KEYS = "connectedWallet";
    const { set, get } = newMockStore();
    const updateState = vi.fn(() => set({ isConnected: true }));
    const createConnection = vi.fn<ConnectionFct>(() => {
      return { updateState };
    });
    const config = createConfigStore();
    const cookies = new Map<string, string>([[STORAGE_KEYS[storageKey], key]]);
    const storage: WeldStorage = {
      get: vi.fn((k) => cookies.get(k)),
      set: vi.fn((k, v) => cookies.set(k, v)),
      remove: vi.fn((k) => cookies.delete(k)),
    };
    config.update({ storage, enablePersistence: true });
    const mngr = new WalletStoreManager<State>({
      setState: set,
      getState: get,
      newState,
      createConnection,
      walletStorageKey: storageKey,
      configStore: config,
      lifecycle,
    });
    expect(cookies.get(STORAGE_KEYS[storageKey])).toBe(key);
    await mngr.disconnect();
    expect(cookies.get(STORAGE_KEYS[storageKey])).toBeUndefined();
  });
});
