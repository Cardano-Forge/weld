// Generic wallet store implementation

import type { ConfigStoreState, WalletConfig } from "@/lib/main/stores/config";
import type { AnyFunction, MaybePromise, Modify, PartialWithDiscriminant } from "../utils/types";
import { Store, StoreSetupFunctions, createStoreFactory } from ".";
import { LifeCycleManager } from "../lifecycle";
import { STORAGE_KEYS } from "@/lib/server";
import {
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
} from "@/lib/main/utils/errors";
import { setupAutoUpdate } from "../update";

type WalletProps<TProps extends object = object> = Modify<
  TProps,
  {
    isConnected: boolean;
    isConnecting: boolean;
    isConnectingTo: string | undefined;
  }
>;
type WalletState<TProps, TKeys extends keyof TProps = keyof TProps> = PartialWithDiscriminant<
  TProps,
  "isConnected",
  TKeys
>;
type ConnectedWalletState<TWalletState> = Extract<TWalletState, { isConnected: true }>;
type DisconnectedWalletState<TWalletState> = Extract<TWalletState, { isConnected: false }>;
type WalletApi<
  TWalletKey extends string,
  TProps extends { key: TWalletKey },
  TApi extends Record<string, AnyFunction>,
> = Modify<
  TApi,
  {
    connect(
      key: TWalletKey,
      config?: Partial<
        WalletConfig & {
          onSuccess(wallet: ConnectedWalletState<WalletState<WalletProps<TProps>>>): void;
          onError(error: unknown): void;
        }
      >,
    ): void;
    connectAsync: (
      key: TWalletKey,
      config?: Partial<WalletConfig>,
    ) => Promise<ConnectedWalletState<WalletState<WalletProps<TProps>>>>;
    disconnect(): void;
  }
>;
export type WalletStoreState<
  TProps extends Record<string, unknown>,
  TApi extends Record<string, AnyFunction>,
  TKeys extends keyof TProps | keyof TApi = keyof TProps | keyof TApi,
> = WalletState<Extract<TKeys, keyof TProps>> & {
  [TKey in Extract<TKeys, keyof TApi>]: TApi[TKey];
};

export type WalletStorePersistData = {
  tryToReconnectTo?: string;
};

export function newWalletStoreCreator<
  TWalletKey extends string,
  TProps extends { key: TWalletKey },
  TApi extends Record<string, AnyFunction>,
>(opts: {
  newState(): PartialWithDiscriminant<WalletProps<TProps>, "isConnected">;
  storageKey: keyof typeof STORAGE_KEYS;
  getConfig?(): ConfigStoreState;
  onUpdateError?(error: unknown): void;
  updateState(): MaybePromise<void>;
}) {
  type TWalletProps = WalletProps<TProps>;
  type TWalletApi = WalletApi<TWalletKey, TProps, TApi>;
  type TWalletStoreState = WalletStoreState<TWalletProps, TWalletApi>;
  type TWalletState = WalletState<TWalletProps>;
  type TConnectedWalletState = ConnectedWalletState<TWalletState>;
  type TWalletStore = Store<TWalletStoreState, WalletStorePersistData>;
  type TExtendedWalletStoreState = TWalletStoreState & StoreSetupFunctions;
  return createStoreFactory<TWalletStoreState>((setState, getState) => {
    const lifecycle = new LifeCycleManager();

    const handleUpdateError = (error: unknown) => {
      opts.getConfig?.().onUpdateError?.("wallet", error);
      opts.getConfig?.().wallet.onUpdateError?.(error);
    };

    const disconnect = () => {
      lifecycle.subscriptions.clearAll();
      lifecycle.inFlight.abortAll();
      setState(opts.newState() as object);
      if (opts.getConfig?.().enablePersistence) {
        opts.getConfig?.().storage.remove(STORAGE_KEYS[opts.storageKey]);
      }
    };

    const connectAsync = async (key: TWalletKey, configOverrides?: Partial<WalletConfig>) => {
      disconnect();

      const signal = lifecycle.inFlight.add();

      try {
        lifecycle.subscriptions.clearAll();

        setState({ isConnectingTo: key, isConnecting: true } as any);

        let abortTimeout: NodeJS.Timeout | undefined = undefined;

        const connectTimeout =
          configOverrides?.connectTimeout ?? opts.getConfig?.().wallet?.connectTimeout;

        if (connectTimeout) {
          abortTimeout = setTimeout(() => {
            signal.aborted = true;
            setState({ isConnectingTo: undefined, isConnecting: false } as any);
          }, connectTimeout);
        }

        // TODO: Create handler, on connect, smth like that

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const safeUpdateState = async (stopUpdates?: () => void) => {
          if (signal.aborted) {
            stopUpdates?.();
            return;
          }
          if (opts.getConfig?.().debug) {
            console.log("[WELD] Wallet state update", key);
          }
          try {
            return await opts.updateState();
          } catch (error) {
            handleUpdateError(error);
            disconnect();
          }
        };

        await opts.updateState();

        const newState = getState();
        if (!newState.isConnected) {
          throw new Error("Connection failed");
        }

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        setupAutoUpdate(safeUpdateState, lifecycle, "wallet", configOverrides);

        if (opts.getConfig?.().enablePersistence) {
          opts.getConfig?.().storage.set(STORAGE_KEYS[opts.storageKey], newState.key);
        }

        if (abortTimeout) {
          clearTimeout(abortTimeout);
        }

        return newState;
      } catch (error) {
        if (error instanceof WalletDisconnectAccountError) {
          disconnect();
        }
        throw error;
      } finally {
        lifecycle.inFlight.remove(signal);
      }
    };

    const connect = async (
      key: TWalletKey,
      {
        onSuccess,
        onError,
        ...config
      }: Partial<
        WalletConfig & {
          onSuccess(wallet: TConnectedWalletState): void;
          onError(error: unknown): void;
        }
      > = {},
    ) => {
      connectAsync(key, config)
        .then((wallet) => {
          onSuccess?.(wallet);
        })
        .catch((error) => {
          onError?.(error);
        });
    };

    const __init = () => {
      if (initialState.isConnectingTo) {
        connect(initialState.isConnectingTo);
      }
    };

    const __persist = (data?: WalletStorePersistData) => {
      let isConnectingTo = data?.tryToReconnectTo;
      if (
        !isConnectingTo &&
        typeof window !== "undefined" &&
        opts.getConfig?.().enablePersistence
      ) {
        isConnectingTo = opts.getConfig?.().getPersistedValue("weld_connected-wallet");
      }
      initialState.isConnectingTo = isConnectingTo;
      initialState.isConnecting = !!isConnectingTo;
    };

    const __cleanup = () => {
      lifecycle.cleanup();
    };

    const initialState: TExtendedWalletStoreState = {
      ...opts.newState(),
      connect,
      connectAsync,
      disconnect,
      __init,
      __cleanup,
      __persist,
    };

    return initialState as TWalletStoreState;
  });
}
