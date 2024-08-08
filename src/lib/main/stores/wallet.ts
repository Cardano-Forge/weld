import { handleAccountChangeErrors } from "@/internal/account-change";
import type { WalletHandler } from "@/internal/handler";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";
import { setupAutoUpdate } from "@/internal/update";
import { STORAGE_KEYS } from "@/lib/server";
import {
  type NetworkId,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  lovelaceToAda,
  WalletUtxosUpdateError,
  getFailureReason,
} from "@/lib/utils";
import { type WalletConfig, defaults, getUpdateConfig } from "../config";
import { connect as weldConnect } from "../connect";
import { getPersistedValue } from "../persistence";
import { deferredPromise } from "@/internal/utils/deferred-promise";

export type WalletProps = WalletInfo & {
  isConnected: boolean;
  isConnectingTo: string | undefined;
  handler: WalletHandler;
  balanceLovelace: number;
  balanceAda: number;
  changeAddressHex: string;
  changeAddressBech32: string;
  stakeAddressHex: string;
  stakeAddressBech32: string;
  networkId: NetworkId;
  isUpdatingUtxos: boolean;
  utxos: string[];
};

const initialWalletState: WalletState = {
  isConnected: false,
  isConnectingTo: undefined,
  handler: undefined,
  balanceLovelace: undefined,
  balanceAda: undefined,
  changeAddressHex: undefined,
  changeAddressBech32: undefined,
  stakeAddressHex: undefined,
  stakeAddressBech32: undefined,
  networkId: undefined,
  supported: undefined,
  key: undefined,
  icon: undefined,
  website: undefined,
  displayName: undefined,
  supportsTxChaining: undefined,
  isUpdatingUtxos: false,
  utxos: undefined,
};

type ConnectWalletCallbacks = {
  onSuccess(wallet: ConnectedWalletState): void;
  onError(error: unknown): void;
};

export type WalletApi = {
  connect(key: string, config?: Partial<WalletConfig & ConnectWalletCallbacks>): void;
  connectAsync: (key: string, config?: Partial<WalletConfig>) => Promise<ConnectedWalletState>;
  disconnect(): void;
  ensureUtxos(): Promise<string[]>;
};

export type WalletState<TKeys extends keyof WalletProps = keyof WalletProps> =
  | { [TKey in TKeys]: TKey extends "isConnected" ? true : WalletProps[TKey] }
  | {
      [TKey in TKeys]: TKey extends "isConnected" ? false : WalletProps[TKey] | undefined;
    };

export type ConnectedWalletState = Extract<WalletState, { isConnected: true }>;
export type DiconnectedWalletState = Extract<WalletState, { isConnected: false }>;

export type WalletStoreState<
  TKeys extends keyof WalletProps | keyof WalletApi = keyof WalletProps | keyof WalletApi,
> = WalletState<Extract<TKeys, keyof WalletProps>> & {
  [TKey in Extract<TKeys, keyof WalletApi>]: WalletApi[TKey];
};
export type WalletStore = Store<WalletStoreState>;

export type CreateWalletStoreOpts = Partial<Pick<WalletProps, "isConnectingTo">> &
  Partial<WalletConfig> & {
    onUpdateError?(error: unknown): void;
  };

export const createWalletStore = createStoreFactory<
  WalletStoreState,
  [opts?: CreateWalletStoreOpts, config?: Partial<WalletConfig>]
>(
  (
    setState,
    getState,
    { onUpdateError, isConnectingTo: initialIsConnectingTo, ...storeConfigOverrides } = {},
  ) => {
    const lifecycle = new LifeCycleManager();

    let inFlightUtxosUpdate:
      | {
          signal: InFlightSignal;
          promise: Promise<string[]>;
          resolve: (utxos: string[]) => void;
        }
      | undefined = undefined;

    const ensureUtxos: WalletApi["ensureUtxos"] = async () => {
      return inFlightUtxosUpdate?.promise ?? getState().utxos ?? [];
    };

    const disconnect: WalletApi["disconnect"] = () => {
      if (inFlightUtxosUpdate) {
        inFlightUtxosUpdate.signal.aborted = true;
        inFlightUtxosUpdate.resolve([]);
      }
      lifecycle.subscriptions.clearAll();
      setState(initialWalletState);
      if (defaults.enablePersistence) {
        defaults.storage.remove(STORAGE_KEYS.connectedWallet);
      }
    };

    const connectAsync: WalletApi["connectAsync"] = async (key, configOverrides) => {
      const signal = lifecycle.inFlight.add();

      try {
        lifecycle.subscriptions.clearAll();

        setState({ isConnectingTo: key });

        let abortTimeout: NodeJS.Timeout | undefined = undefined;

        const connectTimeout =
          configOverrides?.connectTimeout ??
          storeConfigOverrides?.connectTimeout ??
          defaults.wallet?.connectTimeout;

        if (connectTimeout) {
          abortTimeout = setTimeout(() => {
            signal.aborted = true;
            setState({ isConnectingTo: undefined });
          }, connectTimeout);
        }

        const handler: WalletHandler = handleAccountChangeErrors(
          await weldConnect(key),
          async () => {
            const isEnabled = await handler.reenable();
            if (!isEnabled) {
              throw new WalletDisconnectAccountError(
                `Could not reenable ${handler.info.displayName} wallet after account change`,
              );
            }
            safeUpdateState();
            return handler;
          },
          () => handler.defaultApi.isEnabled(),
        );

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const updateUtxos = () => {
          const { promise, resolve } = deferredPromise<string[]>();
          const signal = lifecycle.inFlight.add();
          if (inFlightUtxosUpdate) {
            inFlightUtxosUpdate.signal.aborted = true;
          }
          inFlightUtxosUpdate = { promise, signal, resolve };
          handler
            .getUtxos()
            .then((res) => {
              const utxos = res ?? [];

              if (!signal.aborted) {
                setState({ isUpdatingUtxos: false, utxos });
              }

              if (inFlightUtxosUpdate?.promise && inFlightUtxosUpdate.promise !== promise) {
                inFlightUtxosUpdate.promise.then(resolve);
              } else {
                resolve(utxos);
              }
            })
            .catch((error) => {
              onUpdateError?.(new WalletUtxosUpdateError(getFailureReason(error)));
              if (!signal.aborted) {
                setState({ isUpdatingUtxos: false, utxos: [] });
              }

              if (inFlightUtxosUpdate?.promise && inFlightUtxosUpdate.promise !== promise) {
                promise.then(resolve);
              } else {
                resolve([]);
              }
            })
            .finally(() => {
              if (inFlightUtxosUpdate?.promise && inFlightUtxosUpdate.promise === promise) {
                inFlightUtxosUpdate = undefined;
              }
            });
        };

        // utxos are purposefully omitted here since getUtxos can take a long time
        // to resolve and we don't want it to affect connection speed
        const updateState = async () => {
          const balanceLovelace = await handler.getBalanceLovelace();

          const prevState = getState();
          const hasBalanceChanged = balanceLovelace !== prevState.balanceLovelace;

          const newState: Partial<ConnectedWalletState> = {
            isConnected: true,
            isConnectingTo: undefined,
            handler,
            balanceLovelace,
            balanceAda: lovelaceToAda(balanceLovelace),
            networkId: await handler.getNetworkId(),
            changeAddressHex: await handler.getChangeAddressHex(),
            changeAddressBech32: await handler.getChangeAddress(),
            stakeAddressHex: await handler.getStakeAddressHex(),
            stakeAddressBech32: await handler.getStakeAddress(),
            ...handler.info,
          };

          if (hasBalanceChanged) {
            updateUtxos();
            newState.isUpdatingUtxos = true;
          }

          setState(newState);
        };

        const safeUpdateState = async () => {
          try {
            return await updateState();
          } catch (error) {
            onUpdateError?.(error);
            disconnect();
          }
        };

        await updateState();

        const newState = getState();
        if (!newState.isConnected) {
          throw new Error("Connection failed");
        }

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const updateConfig = getUpdateConfig("wallet", storeConfigOverrides, configOverrides);
        setupAutoUpdate(safeUpdateState, updateConfig, lifecycle);

        if (defaults.enablePersistence) {
          defaults.storage.set(STORAGE_KEYS.connectedWallet, newState.key);
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

    const connect: WalletApi["connect"] = async (key, { onSuccess, onError, ...config } = {}) => {
      connectAsync(key, config)
        .then((wallet) => {
          onSuccess?.(wallet);
        })
        .catch((error) => {
          onError?.(error);
        });
    };

    const initialState: WalletStoreState & StoreLifeCycleMethods = {
      ...initialWalletState,
      isConnectingTo: initialIsConnectingTo,
      connect,
      connectAsync,
      disconnect,
      ensureUtxos,
    };

    initialState.__init = () => {
      if (
        !initialState.isConnectingTo &&
        typeof window !== "undefined" &&
        defaults.enablePersistence
      ) {
        initialState.isConnectingTo = getPersistedValue("connectedWallet");
      }

      if (initialState.isConnectingTo) {
        connect(initialState.isConnectingTo);
      }
    };

    initialState.__cleanup = () => {
      lifecycle.cleanup();
    };

    return initialState;
  },
);
