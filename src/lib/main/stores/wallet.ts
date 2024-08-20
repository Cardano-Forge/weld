import { handleAccountChangeErrors } from "@/internal/account-change";
import { compare } from "@/internal/compare";
import type { WalletHandler } from "@/internal/handler";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";
import { setupAutoUpdate } from "@/internal/update";
import { deferredPromise } from "@/internal/utils/deferred-promise";
import { getFailureReason } from "@/internal/utils/errors";
import {
  type NetworkId,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  WalletUtxosUpdateError,
  lovelaceToAda,
  weld,
} from "@/lib/main";
import { STORAGE_KEYS } from "@/lib/server";
import { connect as weldConnect } from "../connect";
import type { WalletConfig } from "./config";

export type WalletProps = WalletInfo & {
  isConnected: boolean;
  isConnecting: boolean;
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
  isConnecting: false,
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
} & StoreLifeCycleMethods;

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

export type ExtendedWalletStoreState = WalletStoreState & {
  __persist(isConnectingTo?: string): void;
};

export const createWalletStore = createStoreFactory<WalletStoreState>((setState, getState) => {
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

  const handleUpdateError = (error: unknown) => {
    weld.config.getState().onUpdateError?.("wallet", error);
    weld.config.getState().wallet.onUpdateError?.(error);
  };

  const disconnect: WalletApi["disconnect"] = () => {
    if (inFlightUtxosUpdate) {
      inFlightUtxosUpdate.signal.aborted = true;
      inFlightUtxosUpdate.resolve([]);
    }
    lifecycle.subscriptions.clearAll();
    setState(initialWalletState);
    if (weld.config.getState().enablePersistence) {
      weld.config.getState().storage.remove(STORAGE_KEYS.connectedWallet);
    }
  };

  const connectAsync: WalletApi["connectAsync"] = async (key, configOverrides) => {
    const signal = lifecycle.inFlight.add();

    try {
      lifecycle.subscriptions.clearAll();

      setState({ isConnectingTo: key, isConnecting: true });

      let abortTimeout: NodeJS.Timeout | undefined = undefined;

      const connectTimeout =
        configOverrides?.connectTimeout ?? weld.config.getState().wallet?.connectTimeout;

      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          setState({ isConnectingTo: undefined, isConnecting: false });
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

      // Since the utxos update is triggered whenever the balance changes,
      // we know the utxos must have changed when this function is called.
      // This function fetches the utxos in loop until the result is different than the previous utxos
      const getNextUtxos = async () => {
        const state = getState();
        const prevUtxos = state.utxos ? [...state.utxos] : undefined;
        let retryCount = 0;
        let nextUtxos = await handler.getUtxos();
        while (
          typeof prevUtxos !== "undefined" &&
          retryCount++ < 8 &&
          compare(prevUtxos, nextUtxos)
        ) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          nextUtxos = await handler.getUtxos();
        }
        return nextUtxos;
      };

      const updateUtxos = () => {
        const { promise, resolve } = deferredPromise<string[]>();
        const signal = lifecycle.inFlight.add();
        if (inFlightUtxosUpdate) {
          inFlightUtxosUpdate.signal.aborted = true;
        }
        inFlightUtxosUpdate = { promise, signal, resolve };
        getNextUtxos()
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
            handleUpdateError(new WalletUtxosUpdateError(getFailureReason(error)));

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
          isConnecting: false,
          isConnectingTo: undefined,
          handler,
          balanceLovelace,
          balanceAda: lovelaceToAda(balanceLovelace),
          networkId: await handler.getNetworkId(),
          changeAddressHex: await handler.getChangeAddressHex(),
          changeAddressBech32: await handler.getChangeAddressBech32(),
          stakeAddressHex: await handler.getStakeAddressHex(),
          stakeAddressBech32: await handler.getStakeAddressBech32(),
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
          handleUpdateError(error);
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

      setupAutoUpdate(safeUpdateState, lifecycle, "wallet", configOverrides);

      if (weld.config.getState().enablePersistence) {
        weld.config.getState().storage.set(STORAGE_KEYS.connectedWallet, newState.key);
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

  const init: WalletApi["init"] = () => {
    if (initialState.isConnectingTo) {
      connect(initialState.isConnectingTo);
    }
  };

  const __persist: ExtendedWalletStoreState["__persist"] = (serverIsConnectingTo?: string) => {
    let isConnectingTo = serverIsConnectingTo;
    if (
      !isConnectingTo &&
      typeof window !== "undefined" &&
      weld.config.getState().enablePersistence
    ) {
      isConnectingTo = weld.config.getState().getPersistedValue("connectedWallet");
    }
    initialState.isConnectingTo = isConnectingTo;
    initialState.isConnecting = !!isConnectingTo;
  };

  const cleanup: WalletApi["cleanup"] = () => {
    lifecycle.cleanup();
  };

  const initialState: ExtendedWalletStoreState = {
    ...initialWalletState,
    connect,
    connectAsync,
    disconnect,
    ensureUtxos,
    init,
    cleanup,
    __persist,
  };

  return initialState as WalletStoreState;
});
