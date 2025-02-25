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
  type StakeAddressHex,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  WalletUtxosUpdateError,
  decodeBalance,
  hexToBech32,
  isStakeAddressHex,
  lovelaceToAda,
  parseBalance,
  weld,
} from "@/lib/main";
import { connect as weldConnect } from "@/lib/main/connect";
import type { ConfigStore, WalletConfig } from "@/lib/main/stores/config";
import { type ChangeAddressHex, STORAGE_KEYS, isChangeAddressHex } from "@/lib/server";

export type WalletProps = DefaultWalletStoreProps &
  WalletInfo & {
    handler: WalletHandler;
    balanceLovelace: number;
    balanceAda: number;
    /**
     * Encoded cbor string
     * _Same as calling `await handler.getBalance()`_
     */
    balanceEncoded: string;
    /**
     * Decoded cbor balance
     * @see https://github.com/paroga/cbor-js
     */
    balanceDecoded: unknown;
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
    balanceEncoded: undefined,
    balanceDecoded: undefined,
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
  disconnect(): Promise<void>;
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
  tryToReconnectTo?: WalletConfig["tryToReconnectTo"];
};

export type WalletStore = Store<WalletStoreState, WalletStorePersistData> & WalletStoreState;

export const createWalletStore = createStoreFactory<
  WalletStoreState,
  WalletStorePersistData,
  | []
  | [
      {
        config?: ConfigStore;
        lifecycle?: LifeCycleManager;
        connect?: typeof weldConnect;
        utxosUpdate?: UtxosUpdateManager;
        maxUtxosUpdateRetryCount?: number;
        utxosUpdateRetryInterval?: number;
      },
    ]
>(
  (
    setState,
    getState,
    {
      config = weld.config,
      lifecycle = new LifeCycleManager(),
      connect: connectFct = weldConnect,
      utxosUpdate = new UtxosUpdateManager(),
      maxUtxosUpdateRetryCount = 8,
      utxosUpdateRetryInterval = 5000,
    } = {},
  ) => {
    const ensureUtxos: WalletApi["ensureUtxos"] = async () => {
      return utxosUpdate.runningUpdate?.promise ?? getState().utxos ?? [];
    };

    const walletManager = new WalletStoreManager<WalletState>({
      setState,
      getState,
      newState: newWalletState,
      createConnection: async (key, opts) => {
        const handler: WalletHandler = handleAccountChangeErrors(
          await connectFct(key),
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
            retryCount++ < maxUtxosUpdateRetryCount &&
            compare(prevUtxos, nextUtxos)
          ) {
            await new Promise<void>((resolve) => {
              setTimeout(async () => {
                nextUtxos = await handler.getUtxos();
                resolve();
              }, utxosUpdateRetryInterval);
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
          if (handler.isDisconnected) {
            await disconnect();
            return;
          }

          const balanceEncoded = await handler.getBalance();
          const balanceDecoded = decodeBalance(balanceEncoded);
          const balanceLovelace = parseBalance(balanceDecoded, "lovelace");

          const changeAddressHex = await handler.getChangeAddressHex();

          const prevState = getState();
          const hasBalanceChanged = balanceEncoded !== prevState.balanceEncoded;
          const hasAccountChanged = changeAddressHex !== prevState.changeAddressHex;

          const newState: Partial<ConnectedWalletState> = {
            isConnected: true,
            isConnecting: false,
            isConnectingTo: undefined,
            handler,
            balanceEncoded,
            balanceDecoded,
            balanceLovelace,
            balanceAda: lovelaceToAda(balanceLovelace),
            networkId: await handler.getNetworkId(),
            changeAddressHex,
            changeAddressBech32: await handler.getChangeAddressBech32(),
            stakeAddressHex: await handler.getStakeAddressHex(),
            stakeAddressBech32: await handler.getStakeAddressBech32(),
            ...handler.info,
          };

          if (opts.signal.aborted) {
            return;
          }

          if (hasAccountChanged) {
            updateCookieState(newState);
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
      walletStorageKey: "connectedWallet",
      configStore: config,
      lifecycle,
    })
      .on("beforeDisconnect", () => {
        if (utxosUpdate.runningUpdate) {
          utxosUpdate.runningUpdate.signal.aborted = true;
          utxosUpdate.runningUpdate.resolve([]);
        }
        getState().handler?.disconnect();
      })
      .on("afterDisconnect", () => updateCookieState(newWalletState()))
      .on("afterConnect", ({ newState }) => updateCookieState(newState));

    const updateCookieState = (newState: Partial<WalletState>) => {
      if (!config.enablePersistence) {
        return;
      }
      if (newState.key) {
        config.storage.set(STORAGE_KEYS.connectedWallet, newState.key);
      } else {
        config.storage.remove(STORAGE_KEYS.connectedWallet);
      }
      if (newState.changeAddressHex) {
        config.storage.set(STORAGE_KEYS.connectedChange, newState.changeAddressHex);
      } else {
        config.storage.remove(STORAGE_KEYS.connectedChange);
      }
      if (newState.stakeAddressHex) {
        config.storage.set(STORAGE_KEYS.connectedStake, newState.stakeAddressHex);
      } else {
        config.storage.remove(STORAGE_KEYS.connectedStake);
      }
    };

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
      let wallet: string | undefined = undefined;
      let changeAddressHex: ChangeAddressHex | undefined = undefined;
      let stakeAddressHex: StakeAddressHex | undefined = undefined;

      const canPersistFromCookies = typeof window !== "undefined" && config.enablePersistence;

      if (typeof data?.tryToReconnectTo === "string") {
        wallet = data.tryToReconnectTo;
      } else if (data?.tryToReconnectTo) {
        wallet = data.tryToReconnectTo.wallet;

        // Only persist address from cookies when persist data is an object to prevent
        // hydration errors on sites that only track wallet cookies on the server
        let change = data.tryToReconnectTo.change;
        if (!change && canPersistFromCookies) {
          change = config.getPersistedValue(STORAGE_KEYS.connectedChange);
        }
        if (isChangeAddressHex(change)) {
          changeAddressHex = change;
        }

        let stake = data.tryToReconnectTo.stake;
        if (!stake && canPersistFromCookies) {
          stake = config.getPersistedValue(STORAGE_KEYS.connectedStake);
        }
        if (isStakeAddressHex(stake)) {
          stakeAddressHex = stake;
        }
      }

      if (!wallet && canPersistFromCookies) {
        wallet = config.getPersistedValue(STORAGE_KEYS.connectedWallet);
      }

      if (!wallet) {
        changeAddressHex = undefined;
        stakeAddressHex = undefined;
      }

      const changeAddressBech32 = hexToBech32(changeAddressHex);
      const stakeAddressBech32 = hexToBech32(stakeAddressHex);

      setState({
        isConnectingTo: wallet,
        isConnecting: !!wallet,
        changeAddressHex,
        stakeAddressHex,
        changeAddressBech32,
        stakeAddressBech32,
      } as Partial<WalletState>);

      initialState.isConnectingTo = wallet;
      initialState.isConnecting = !!wallet;
      initialState.changeAddressHex = changeAddressHex;
      initialState.stakeAddressHex = stakeAddressHex;
      initialState.changeAddressBech32 = changeAddressBech32;
      initialState.stakeAddressBech32 = stakeAddressBech32;
    };

    const __cleanup = () => {
      walletManager.cleanup();
    };

    const initialState: WalletStoreState & StoreSetupFunctions & { __mngr: typeof walletManager } =
      {
        ...newWalletState(),
        connect,
        connectAsync,
        disconnect,
        ensureUtxos,
        __init,
        __cleanup,
        __persist,
        __mngr: walletManager,
      };

    return initialState as WalletStoreState;
  },
);
