// Generic wallet store implementation

import type { ConfigStoreState, WalletConfig } from "@/lib/main/stores/config";
import {
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
} from "@/lib/main/utils/errors";
import { STORAGE_KEYS } from "@/lib/server";
import { type Store, type StoreSetupFunctions, createStoreFactory } from ".";
import { LifeCycleManager } from "../lifecycle";
import { setupAutoUpdate } from "../update";
import type { AnyFunction, MaybePromise, Modify, PartialWithDiscriminant } from "../utils/types";

export type DefaultWalletProps = {
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: string | undefined;
};

// biome-ignore lint/suspicious/noExplicitAny: Allow any for generic types
export type WalletProps<TProps extends Record<string, unknown> = any> = PartialWithDiscriminant<
  Modify<TProps, DefaultWalletProps>,
  "isConnected"
>;

export type ConnectedWalletState<TProps extends WalletProps> = Extract<
  TProps,
  { isConnected: true }
>;

type ExtractKeyType<T> = "key" extends keyof T
  ? T["key"] extends string
    ? T["key"]
    : string
  : string;

export type DefaultWalletApi<TProps extends WalletProps> = {
  connect(
    key: ExtractKeyType<TProps>,
    config?: Partial<
      WalletConfig & {
        onSuccess(wallet: ConnectedWalletState<TProps>): void;
        onError(error: unknown): void;
      }
    >,
  ): void;
  connectAsync: (
    key: ExtractKeyType<TProps>,
    config?: Partial<WalletConfig>,
  ) => Promise<ConnectedWalletState<TProps>>;
  disconnect(): void;
};

export type WalletApi<
  TProps extends WalletProps,
  // biome-ignore lint/suspicious/noExplicitAny: Allow any for generic types
  TApi extends Record<string, AnyFunction> = any,
> = Modify<TApi, DefaultWalletApi<TProps>>;

export type WalletStoreState<TProps extends WalletProps, TApi extends WalletApi<TProps>> = TProps &
  TApi;

export type WalletStorePersistData = {
  tryToReconnectTo?: string;
};

type DefaultWalletStore = Store<
  WalletStoreState<
    WalletProps<Record<string, never>>,
    WalletApi<WalletProps<Record<string, never>>>
  >
>;

export type WalletStore<TProps extends WalletProps, TApi extends WalletApi<TProps>> = Store<
  WalletStoreState<TProps, TApi>,
  WalletStorePersistData
>;

export function newWalletStoreCreator<TProps extends WalletProps, TApi extends WalletApi<TProps>>(
  createOpts: (ctx: {
    getState: WalletStore<TProps, TApi>["getState"];
    setState: WalletStore<TProps, TApi>["setState"];
    lifecycle: LifeCycleManager;
  }) => {
    newState(): TProps;
    storageKey: keyof typeof STORAGE_KEYS;
    getConfig?(): ConfigStoreState;
    onUpdateError?(error: unknown): void;
    updateState(): MaybePromise<void>;
    api: Omit<TApi, keyof DefaultWalletApi<TProps>>;
  },
) {
  return createStoreFactory<WalletStoreState<TProps, TApi>, WalletStorePersistData>(
    (setState, getState) => {
      const lifecycle = new LifeCycleManager();

      const opts = createOpts({
        getState,
        setState,
        lifecycle,
      });

      const setDefaultState: DefaultWalletStore["setState"] = (partial) => {
        setState(partial as Partial<WalletStoreState<TProps, TApi>>);
      };

      const handleUpdateError = (error: unknown) => {
        opts.getConfig?.().onUpdateError?.("wallet", error);
        opts.getConfig?.().wallet.onUpdateError?.(error);
      };

      const disconnect: DefaultWalletApi<TProps>["disconnect"] = () => {
        lifecycle.subscriptions.clearAll();
        lifecycle.inFlight.abortAll();
        setState(opts.newState() as object);
        if (opts.getConfig?.().enablePersistence) {
          opts.getConfig?.().storage.remove(STORAGE_KEYS[opts.storageKey]);
        }
      };

      const connectAsync: DefaultWalletApi<TProps>["connectAsync"] = async (
        key,
        configOverrides,
      ) => {
        disconnect();

        const signal = lifecycle.inFlight.add();

        try {
          lifecycle.subscriptions.clearAll();

          setDefaultState({ isConnectingTo: key, isConnecting: true });

          let abortTimeout: NodeJS.Timeout | undefined = undefined;

          const connectTimeout =
            configOverrides?.connectTimeout ?? opts.getConfig?.().wallet?.connectTimeout;

          if (connectTimeout) {
            abortTimeout = setTimeout(() => {
              signal.aborted = true;
              setDefaultState({ isConnectingTo: undefined, isConnecting: false });
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

          return newState as ConnectedWalletState<TProps>;
        } catch (error) {
          if (error instanceof WalletDisconnectAccountError) {
            disconnect();
          }
          throw error;
        } finally {
          lifecycle.inFlight.remove(signal);
        }
      };

      const connect: DefaultWalletApi<TProps>["connect"] = async (
        key,
        { onSuccess, onError, ...config } = {},
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

      const storeSetupFunctions: StoreSetupFunctions = {
        __init,
        __cleanup,
        __persist,
      };

      const defaultApi: DefaultWalletApi<TProps> = {
        connect,
        connectAsync,
        disconnect,
      };

      const initialState: WalletStoreState<TProps, TApi> & StoreSetupFunctions = {
        ...opts.newState(),
        ...opts.api,
        ...defaultApi,
        ...storeSetupFunctions,
      };

      return initialState as WalletStoreState<TProps, TApi>;
    },
  );
}
