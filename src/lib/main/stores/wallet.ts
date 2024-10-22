import { handleAccountChangeErrors } from "@/internal/account-change";
import { compare } from "@/internal/compare";
import type { WalletHandler } from "@/internal/handler";
import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";
import { getFailureReason } from "@/internal/utils/errors";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import { UtxosUpdateManager } from "@/internal/utxos-update";
import { type DefaultWalletStoreProps, WalletStoreManager } from "@/internal/wallet-store";
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

export type WalletProps = DefaultWalletStoreProps &
  WalletInfo & {
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

export const createWalletStore = createStoreFactory<
  WalletStoreState,
  WalletStorePersistData,
  [] | [{ lifecycle?: LifeCycleManager; utxosUpdate?: UtxosUpdateManager }]
>(
  (
    setState,
    getState,
    { lifecycle = new LifeCycleManager(), utxosUpdate = new UtxosUpdateManager() } = {},
  ) => {
    const ensureUtxos: WalletApi["ensureUtxos"] = async () => {
      return utxosUpdate.runningUpdate?.promise ?? getState().utxos ?? [];
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
              await walletManager.handleUpdateError(error);
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
          const running = utxosUpdate.start({ lifecycle });
          getNextUtxos({ expectChange })
            .then((res) => {
              const utxos = res ?? [];

              if (!running.update.signal.aborted && !handler.isDisconnected) {
                setState({ isUpdatingUtxos: false, utxos });
              }

              running.resolve(utxos);
            })
            .catch((error) => {
              walletManager
                .handleUpdateError(new WalletUtxosUpdateError(getFailureReason(error)))
                .then(() => {
                  if (!running.update.signal.aborted && !handler.isDisconnected) {
                    setState({ isUpdatingUtxos: false, utxos: [] });
                  }
                  running.resolve([]);
                });
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
      if (utxosUpdate.runningUpdate) {
        utxosUpdate.runningUpdate.signal.aborted = true;
        utxosUpdate.runningUpdate.resolve([]);
      }
      getState().handler?.disconnect();
    });

    const connectAsync: WalletApi["connectAsync"] = async (key, configOverrides) => {
      await walletManager.disconnect();
      return await walletManager.connect(key, { configOverrides });
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

    const initialState: WalletStoreState & StoreSetupFunctions = {
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
