import { type WalletConfig, createConfigStore } from "@/lib/main/stores/config";
import {
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
} from "@/lib/main/utils/errors";
import { STORAGE_KEYS } from "@/lib/server";
import { type InFlightSignal, LifeCycleManager } from "../lifecycle";
import { setupAutoUpdate } from "../update";
import type { MaybePromise, PartialWithDiscriminant } from "../utils/types";

export type DefaultWalletStoreProps = {
  key: string;
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: string | undefined;
};

export type DefaultWalletStoreState = PartialWithDiscriminant<
  DefaultWalletStoreProps,
  "isConnected"
>;

type ConnectOpts = {
  signal: InFlightSignal;
  configOverrides?: Partial<WalletConfig>;
};

type Events = {
  beforeDisconnect: undefined;
  afterDisconnect: undefined;
  updateError: unknown;
};

type EventsWithParams = {
  [TEvent in keyof Events as Events[TEvent] extends undefined ? never : TEvent]: Events[TEvent];
};
type EventsWithoutParams = Omit<Events, keyof EventsWithParams>;

type EventHandler<TEvent extends keyof Events> = Events[TEvent] extends undefined
  ? () => MaybePromise<void>
  : (params: Events[TEvent]) => MaybePromise<void>;

export class WalletStoreManager<TProps extends DefaultWalletStoreState = DefaultWalletStoreState> {
  private _subscriptions: { [TEvent in keyof Events]: Set<EventHandler<TEvent>> } = {
    beforeDisconnect: new Set(),
    afterDisconnect: new Set(),
    updateError: new Set(),
  };

  constructor(
    private _setState: (s: Partial<TProps>) => void,
    private _getState: () => TProps,
    private _newState: () => TProps,
    private _createConnection: (
      key: NonNullable<TProps["key"]>,
      opts: ConnectOpts,
    ) => MaybePromise<{
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
    this._runSubscriptions("beforeDisconnect");
    this._setState(this._newState());
    if (this._configStore.getState().enablePersistence) {
      this._configStore.getState().storage.remove(STORAGE_KEYS[this._walletStorageKey]);
    }
    this._runSubscriptions("afterDisconnect");
  }

  async connect(
    key: NonNullable<TProps["key"]>,
    { signal = this._lifecycle.inFlight.add(), configOverrides }: Partial<ConnectOpts> = {},
  ) {
    try {
      this._lifecycle.subscriptions.clearAll();

      this._setState({ isConnectingTo: key, isConnecting: true } as Partial<TProps>);

      let abortTimeout: NodeJS.Timeout | undefined = undefined;
      const connectTimeout =
        configOverrides?.connectTimeout ?? this._configStore.getState().wallet?.connectTimeout;
      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          this._setState({ isConnectingTo: undefined, isConnecting: false } as Partial<TProps>);
        }, connectTimeout);
      }

      const connection = await this._createConnection(key, { signal, configOverrides });

      const safeUpdateState = async (stopUpdates?: () => void) => {
        if (signal.aborted) {
          stopUpdates?.();
          return;
        }
        try {
          return await connection.updateState();
        } catch (error) {
          this.handleUpdateError(error);
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

      setupAutoUpdate(
        safeUpdateState,
        this._lifecycle,
        this._configStore,
        "wallet",
        configOverrides,
      );

      if (this._configStore.getState().enablePersistence) {
        this._configStore
          .getState()
          .storage.set(STORAGE_KEYS[this._walletStorageKey], newState.key);
      }

      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }

      return newState as Extract<TProps, { isConnected: true }>;
    } catch (error) {
      if (error instanceof WalletDisconnectAccountError) {
        await this.disconnect();
      }
      throw error;
    } finally {
      this._lifecycle.inFlight.remove(signal);
    }
  }

  init(opts: { initialState: TProps }) {
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

  persist(opts: { initialState: TProps }, data?: { tryToReconnectTo?: string }) {
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

  handleUpdateError(error: unknown) {
    this._configStore.getState().onUpdateError?.("wallet", error);
    this._configStore.getState().wallet.onUpdateError?.(error);
    this._runSubscriptions("updateError", error);
  }

  private async _runSubscriptions<TEvent extends keyof EventsWithParams>(
    event: TEvent,
    params: EventsWithParams[TEvent],
  ): Promise<void>;
  private async _runSubscriptions<TEvent extends keyof EventsWithoutParams>(
    event: TEvent,
  ): Promise<void>;
  private async _runSubscriptions<TEvent extends keyof Events>(
    event: TEvent,
    params?: Events[TEvent],
  ) {
    for (const handler of this._subscriptions[event]) {
      await handler(params);
    }
  }
}
