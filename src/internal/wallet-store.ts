import { setupAutoUpdate } from "@/internal/auto-update";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import type { MaybePromise, PartialWithDiscriminant } from "@/internal/utils/types";
import {
  type ConfigStore,
  type WalletConfig,
  type WeldConfig,
  createConfigStore,
} from "@/lib/main/stores/config";
import { WalletConnectionAbortedError } from "@/lib/main/utils/errors";
import { STORAGE_KEYS } from "@/lib/server";

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

export type WalletStoreManagerConnectOpts = {
  signal: InFlightSignal;
  configOverrides?: Partial<WalletConfig>;
};

export type WalletStorePersistData = {
  tryToReconnectTo?: string;
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

export type WalletStoreManagerSubscriptions = {
  [TEvent in keyof Events]: Set<EventHandler<TEvent>>;
};
export function newWalletStoreManagerSubscriptions(): WalletStoreManagerSubscriptions {
  return {
    beforeDisconnect: new Set(),
    afterDisconnect: new Set(),
    updateError: new Set(),
  };
}

type WalletStoreManagerCtx<TProps extends DefaultWalletStoreState> = {
  setState: (s: Partial<TProps>) => void;
  getState: () => TProps;
  newState: () => TProps;
  createConnection: (
    key: NonNullable<TProps["key"]>,
    opts: WalletStoreManagerConnectOpts,
  ) => MaybePromise<{ updateState: () => MaybePromise<void> }>;
  walletStorageKey: keyof typeof STORAGE_KEYS;
  configStore?: ConfigStore | ConfigStore<Omit<WeldConfig, "customWallets">>;
  lifecycle?: LifeCycleManager;
  subscriptions?: WalletStoreManagerSubscriptions;
};

export class WalletStoreManager<TProps extends DefaultWalletStoreState = DefaultWalletStoreState> {
  private _ctx: Required<WalletStoreManagerCtx<TProps>>;

  constructor({
    configStore = createConfigStore(),
    lifecycle = new LifeCycleManager(),
    subscriptions = newWalletStoreManagerSubscriptions(),
    ...rest
  }: WalletStoreManagerCtx<TProps>) {
    this._ctx = { configStore, lifecycle, subscriptions, ...rest };
  }

  on<TEvent extends keyof Events>(event: TEvent, handler: EventHandler<TEvent>) {
    this._ctx.subscriptions[event].add(handler);
    return this;
  }

  async disconnect() {
    this._ctx.lifecycle.cleanup();
    this._runSubscriptions("beforeDisconnect");
    this._ctx.setState(this._ctx.newState());
    if (this._ctx.configStore.enablePersistence) {
      this._ctx.configStore.storage.remove(STORAGE_KEYS[this._ctx.walletStorageKey]);
    }
    this._runSubscriptions("afterDisconnect");
  }

  async connect(
    key: NonNullable<TProps["key"]>,
    {
      signal = this._ctx.lifecycle.inFlight.add(),
      configOverrides,
    }: Partial<WalletStoreManagerConnectOpts> = {},
  ) {
    try {
      this._ctx.lifecycle.subscriptions.clearAll();

      this._ctx.setState({ isConnectingTo: key, isConnecting: true } as Partial<TProps>);

      let abortTimeout: NodeJS.Timeout | undefined = undefined;
      const connectTimeout =
        configOverrides?.connectTimeout ?? this._ctx.configStore.wallet?.connectTimeout;
      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          this._ctx.setState({ isConnectingTo: undefined, isConnecting: false } as Partial<TProps>);
        }, connectTimeout);
      }

      const connection = await this._ctx.createConnection(key, { signal, configOverrides });

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

      const newState = this._ctx.getState();
      if (!newState.isConnected) {
        throw new Error("Connection failed");
      }

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      setupAutoUpdate(
        safeUpdateState,
        this._ctx.lifecycle,
        this._ctx.configStore,
        "wallet",
        configOverrides,
      );

      if (this._ctx.configStore.enablePersistence) {
        this._ctx.configStore.storage.set(STORAGE_KEYS[this._ctx.walletStorageKey], newState.key);
      }

      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }

      return newState as Extract<TProps, { isConnected: true }>;
    } catch (error) {
      if (!(error instanceof WalletConnectionAbortedError)) {
        await this.disconnect();
      }
      throw error;
    } finally {
      this._ctx.lifecycle.inFlight.remove(signal);
    }
  }

  async init(opts: { initialState: TProps }) {
    if (opts.initialState.isConnectingTo) {
      await this.connect(opts.initialState.isConnectingTo).catch((error) => {
        if (this._ctx.configStore.debug) {
          console.log("[WELD] Wallet auto connect failed", {
            key: opts.initialState.isConnectingTo,
            error,
          });
        }
      });
    }
  }

  persist(opts: { initialState: TProps }, data?: WalletStorePersistData) {
    let isConnectingTo = data?.tryToReconnectTo;
    if (
      !isConnectingTo &&
      typeof window !== "undefined" &&
      this._ctx.configStore.enablePersistence
    ) {
      isConnectingTo = this._ctx.configStore.getPersistedValue(
        STORAGE_KEYS[this._ctx.walletStorageKey],
      );
    }
    this._ctx.setState({ isConnectingTo, isConnecting: !!isConnectingTo } as Partial<TProps>);
    opts.initialState.isConnectingTo = isConnectingTo;
    opts.initialState.isConnecting = !!isConnectingTo;
  }

  cleanup() {
    this._ctx.lifecycle.cleanup();
  }

  async handleUpdateError(error: unknown) {
    this._ctx.configStore.onUpdateError?.("wallet", error);
    this._ctx.configStore.wallet.onUpdateError?.(error);
    await this._runSubscriptions("updateError", error);
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
    for (const handler of this._ctx.subscriptions[event]) {
      await handler(params);
    }
  }
}
