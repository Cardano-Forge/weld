import { handleAccountChangeErrors } from "@/internal/account-change";
import { compare } from "@/internal/compare";
import type { WalletHandler } from "@/internal/handler";
import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";
import { setupAutoUpdate } from "@/internal/update";
import { STORAGE_KEYS } from "@/lib/server";
import {
  type NetworkId,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  lovelaceToAda,
} from "@/lib/utils";
import { type WalletConfig, defaults, getUpdateConfig } from "../config";
import { connect as weldConnect } from "../connect";
import { getPersistedValue } from "../persistence";

type WalletProps = WalletInfo & {
  isConnectingTo: string | undefined;
  handler: WalletHandler;
  balanceLovelace: number;
  balanceAda: number;
  changeAddressHex: string;
  changeAddressBech32: string;
  stakeAddressHex: string;
  stakeAddressBech32: string;
  networkId: NetworkId;
  utxos?: string[] | undefined;
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
  utxos: undefined,
  supported: undefined,
  key: undefined,
  icon: undefined,
  website: undefined,
  displayName: undefined,
  description: undefined,
  supportsTxChaining: undefined,
};

type ConnectWalletCallbacks = {
  onSuccess(wallet: ConnectedWalletState): void;
  onError(error: unknown): void;
};

type WalletApi = {
  connect(key: string, config?: Partial<WalletConfig & ConnectWalletCallbacks>): void;
  connectAsync: (key: string, config?: Partial<WalletConfig>) => Promise<ConnectedWalletState>;
  disconnect(): void;
};

export type WalletState =
  | ({ isConnected: true } & WalletProps)
  | ({ isConnected: false } & { [TKey in keyof WalletProps]: WalletProps[TKey] | undefined });

export type ConnectedWalletState = Extract<WalletState, { isConnected: true }>;
export type DiconnectedWalletState = Extract<WalletState, { isConnected: false }>;

export type WalletStoreState = WalletState & WalletApi;
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

    const disconnect: WalletApi["disconnect"] = () => {
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

        // utxos are purposefully omitted here since getUtxos can take a long time
        // to resolve and we don't want it to affect connection speed
        const updateState = async () => {
          const balanceLovelace = await handler.getBalanceLovelace();
          const newState: ConnectedWalletState = {
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

          setState(newState);
          return newState;
        };

        const safeUpdateState = async () => {
          try {
            return await updateState();
          } catch (error) {
            onUpdateError?.(error);
            disconnect();
          }
        };

        const newState = await updateState();

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const updateConfig = getUpdateConfig("wallet", storeConfigOverrides, configOverrides);
        setupAutoUpdate(safeUpdateState, updateConfig, lifecycle);

        const safeUpdateUtxos = async () => {
          try {
            const utxos = await handler.getUtxos();
            const prev = getState().utxos;
            // Keep stable reference to utxos array until its contents change
            if (!signal.aborted && !compare(utxos, prev)) {
              setState({ utxos });
            }
          } catch (error) {
            onUpdateError?.(error);
            disconnect();
          }
        };

        setupAutoUpdate(
          safeUpdateUtxos,
          {
            ...updateConfig,
            updateInterval: updateConfig.updateUtxosInterval ?? updateConfig.updateInterval,
          },
          lifecycle,
        );

        safeUpdateUtxos();

        if (defaults.enablePersistence) {
          defaults.storage.set(STORAGE_KEYS.connectedWallet, newState.key);
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
