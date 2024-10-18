import {
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
} from "@/lib/main/utils/errors";
import type { GetStateFunction, SetStateFunction } from ".";
import { type InFlightSignal, LifeCycleManager } from "../lifecycle";
import type { MaybePromise } from "../utils/types";
import { setupAutoUpdate } from "../update";
import { type WalletConfig, createConfigStore } from "@/lib/main/stores/config";
import type { STORAGE_KEYS } from "@/lib/server";

export type WalletStoreProps = {
  key: string;
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: string | undefined;
};

type Events = {
  disconnect: never;
  updateError: unknown;
};

type EventHandler<TEvent extends keyof Events> = Events[TEvent] extends never
  ? () => MaybePromise<void>
  : (params: Events[TEvent]) => MaybePromise<void>;

export class WalletStoreManager {
  private _subscriptions: { [TEvent in keyof Events]: Set<EventHandler<TEvent>> } = {
    disconnect: new Set(),
    updateError: new Set(),
  };

  constructor(
    private _setState: SetStateFunction<WalletStoreProps>,
    private _getState: GetStateFunction<WalletStoreProps>,
    private _createConnection: () => MaybePromise<{
      updateState: () => MaybePromise<void>;
    }>,
    private _walletStorageKey: keyof typeof STORAGE_KEYS,
    private _configStore = createConfigStore(),
    private _lifecycle = new LifeCycleManager(),
  ) {}

  on<TEvent extends keyof Events>(event: TEvent, handler: EventHandler<TEvent>) {
    this._subscriptions[event].add(handler);
    return this;
  }

  async disconnect() {
    this._lifecycle.subscriptions.clearAll();
    this._lifecycle.inFlight.abortAll();
    for (const handler of this._subscriptions.disconnect) {
      await handler();
    }
  }

  async connect(
    key: string,
    {
      signal = this._lifecycle.inFlight.add(),
      configOverrides,
    }: {
      signal?: InFlightSignal;
      configOverrides?: Partial<WalletConfig>;
    } = {},
  ) {
    try {
      await this.disconnect();

      this._lifecycle.subscriptions.clearAll();

      this._setState({ isConnectingTo: key, isConnecting: true });

      let abortTimeout: NodeJS.Timeout | undefined = undefined;
      const connectTimeout =
        configOverrides?.connectTimeout ?? this._configStore.getState().wallet?.connectTimeout;
      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          this._setState({ isConnectingTo: undefined, isConnecting: false });
        }, connectTimeout);
      }

      const connection = await this._createConnection();

      const safeUpdateState = async (stopUpdates?: () => void) => {
        if (signal.aborted) {
          stopUpdates?.();
          return;
        }
        try {
          return await connection.updateState();
        } catch (error) {
          this._handleUpdateError(error);
          await this.disconnect();
        }
      };

      await connection.updateState();

      const newState = this._getState();
      if (!newState.isConnected) {
        throw new Error("Connection failed");
      }

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      setupAutoUpdate(safeUpdateState, this._lifecycle, "wallet", configOverrides);

      if (this._configStore.getState().enablePersistence) {
        this._configStore.getState().storage.set(this._walletStorageKey, newState.key);
      }

      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }

      return newState;
    } catch (error) {
      if (error instanceof WalletDisconnectAccountError) {
        await this.disconnect();
      }
      throw error;
    } finally {
      this._lifecycle.inFlight.remove(signal);
    }
  }

  init(opts: { initialState: WalletStoreProps }) {
    if (opts.initialState.isConnectingTo) {
      this.connect(opts.initialState.isConnectingTo).catch((error) => {
        if (this._configStore.getState().debug) {
          console.log("[WELD] Wallet auto connect failed", {
            key: opts.initialState.isConnectingTo,
            error,
          });
        }
      });
    }
  }

  persist(opts: { initialState: WalletStoreProps }, data?: { tryToReconnectTo?: string }) {
    let isConnectingTo = data?.tryToReconnectTo;
    if (
      !isConnectingTo &&
      typeof window !== "undefined" &&
      this._configStore.getState().enablePersistence
    ) {
      isConnectingTo = this._configStore.getState().getPersistedValue("weld_connected-wallet");
    }
    opts.initialState.isConnectingTo = isConnectingTo;
    opts.initialState.isConnecting = !!isConnectingTo;
  }

  cleanup() {
    this._lifecycle.cleanup();
  }

  private _handleUpdateError(error: unknown) {
    this._configStore.getState().onUpdateError?.("wallet", error);
    this._configStore.getState().wallet.onUpdateError?.(error);
    for (const handler of this._subscriptions.updateError) {
      handler(error);
    }
  }
}
