import { handleAccountChangeErrors } from "@/internal/account-change";
import { compare } from "@/internal/compare";
import type { WalletHandler } from "@/internal/handler";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";
import { deferredPromise } from "@/internal/utils/deferred-promise";
import { getFailureReason } from "@/internal/utils/errors";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  type NetworkId,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  WalletUtxosUpdateError,
  lovelaceToAda,
  weld,
} from "@/lib/main";
import { connect as weldConnect } from "@/lib/main/connect";
import type { WalletConfig } from "@/lib/main/stores/config";
import { WalletStoreManager } from "./manager";

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

function newWalletState(): WalletState {
  return {
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
}

export type ConnectWalletCallbacks = {
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
  PartialWithDiscriminant<WalletProps, "isConnected", TKeys>;

export type ConnectedWalletState = Extract<WalletState, { isConnected: true }>;
export type DiconnectedWalletState = Extract<WalletState, { isConnected: false }>;

export type WalletStoreState<
  TKeys extends keyof WalletProps | keyof WalletApi = keyof WalletProps | keyof WalletApi,
> = WalletState<Extract<TKeys, keyof WalletProps>> & {
  [TKey in Extract<TKeys, keyof WalletApi>]: WalletApi[TKey];
};

export type WalletStorePersistData = {
  tryToReconnectTo?: string;
};

export type WalletStore = Store<WalletStoreState, WalletStorePersistData>;

export type ExtendedWalletStoreState = WalletStoreState & StoreSetupFunctions;

export const createWalletStore = createStoreFactory<WalletStoreState, WalletStorePersistData>(
  (setState, getState) => {
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

    const walletManager = new WalletStoreManager<WalletState>(
      setState,
      getState,
      newWalletState,
      async (key, opts) => {
        const handler: WalletHandler = handleAccountChangeErrors(
          await weldConnect(key),
          async () => {
            const isEnabled = await handler.reenable();
            if (!isEnabled) {
              throw new WalletDisconnectAccountError(
                `Could not reenable ${handler.info.displayName} wallet after account change`,
              );
            }
            updateState().catch(async (error) => {
              walletManager.handleUpdateError(error);
              await walletManager.disconnect();
            });
            return handler;
          },
          () => handler.defaultApi.isEnabled(),
        );

        if (opts.signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        // When the balance updates, we know the utxos must have changed as well
        // in which case the `getUtxos` function gets called repeatedly until a change is observed
        const getNextUtxos = async ({ expectChange = false } = {}) => {
          const state = getState();
          const prevUtxos = state.utxos ? [...state.utxos] : undefined;
          let retryCount = 0;
          let nextUtxos = await handler.getUtxos();
          while (
            expectChange &&
            typeof prevUtxos !== "undefined" &&
            retryCount++ < 8 &&
            compare(prevUtxos, nextUtxos)
          ) {
            await new Promise<void>((resolve) => {
              setTimeout(async () => {
                nextUtxos = await handler.getUtxos();
                resolve();
              }, 3000);
            });
          }
          return nextUtxos;
        };

        const updateUtxos = ({ expectChange = false } = {}) => {
          const { promise, resolve } = deferredPromise<string[]>();
          const signal = lifecycle.inFlight.add();
          if (inFlightUtxosUpdate) {
            inFlightUtxosUpdate.signal.aborted = true;
          }
          inFlightUtxosUpdate = { promise, signal, resolve };
          getNextUtxos({ expectChange })
            .then((res) => {
              const utxos = res ?? [];

              if (!signal.aborted && !handler.isDisconnected) {
                setState({ isUpdatingUtxos: false, utxos });
              }

              if (inFlightUtxosUpdate?.promise && inFlightUtxosUpdate.promise !== promise) {
                inFlightUtxosUpdate.promise.then(resolve);
              } else {
                resolve(utxos);
              }
            })
            .catch((error) => {
              walletManager.handleUpdateError(new WalletUtxosUpdateError(getFailureReason(error)));

              if (!signal.aborted && !handler.isDisconnected) {
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

          if (opts.signal.aborted) {
            return;
          }

          if (hasBalanceChanged) {
            updateUtxos({ expectChange: hasBalanceChanged });
            newState.isUpdatingUtxos = true;
          }

          if (!handler.isDisconnected) {
            setState(newState);
          }
        };

        return {
          updateState,
        };
      },
      "connectedWallet",
      weld.config,
      lifecycle,
    ).on("beforeDisconnect", () => {
      if (inFlightUtxosUpdate) {
        inFlightUtxosUpdate.signal.aborted = true;
        inFlightUtxosUpdate.resolve([]);
      }
      getState().handler?.disconnect();
    });

    const connectAsync: WalletApi["connectAsync"] = async (key, configOverrides) => {
      const signal = lifecycle.inFlight.add();
      const newState = await walletManager.connect(key, {
        signal,
        configOverrides,
      });
      return newState;
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

    const disconnect = () => {
      return walletManager.disconnect();
    };

    const __init = () => {
      walletManager.init({ initialState });
    };

    const __persist = (data?: WalletStorePersistData) => {
      walletManager.persist({ initialState }, data);
    };

    const __cleanup = () => {
      walletManager.cleanup();
    };

    const initialState: ExtendedWalletStoreState = {
      ...newWalletState(),
      connect,
      connectAsync,
      disconnect,
      ensureUtxos,
      __init,
      __cleanup,
      __persist,
    };

    return initialState as WalletStoreState;
  },
);