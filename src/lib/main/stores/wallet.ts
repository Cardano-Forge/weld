import { handleAccountChangeErrors } from "@/internal/account-change";
import type { WalletHandler } from "@/internal/handler";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";
import { STORAGE_KEYS } from "@/lib/server";
import {
  type NetworkId,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  lovelaceToAda,
} from "@/lib/utils";
import { type WalletConfig, defaults } from "../config";
import { connect as weldConnect } from "../connect";
import { getPersistedValue } from "../persistence";

type WalletProps = WalletInfo & {
  isConnectingTo: string | undefined;
  handler: WalletHandler;
  balanceLovelace: number;
  balanceAda: number;
  rewardAddress: string;
  changeAddress: string;
  networkId: NetworkId;
};

const initialWalletState: WalletState = {
  isConnected: false,
  isConnectingTo: undefined,
  handler: undefined,
  balanceLovelace: undefined,
  balanceAda: undefined,
  rewardAddress: undefined,
  changeAddress: undefined,
  networkId: undefined,
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

export type CreateWalletStoreOpts = Partial<Pick<WalletProps, "isConnectingTo">> & {
  onUpdateError?(error: unknown): void;
};

type InFlightConnection = {
  aborted: boolean;
};

export const createWalletStore = createStoreFactory<
  WalletStoreState,
  [opts?: CreateWalletStoreOpts, config?: Partial<WalletConfig>]
>((setState, _getState, { onUpdateError, ...initialProps } = {}, storeConfigOverrides = {}) => {
  const subscriptions = new Set<() => void>();
  const inFlightConnections = new Set<InFlightConnection>();

  const abortInFlightConnections = () => {
    for (const connection of inFlightConnections) {
      connection.aborted = true;
    }
    inFlightConnections.clear();
  };

  const clearSubscriptions = () => {
    for (const unsubscribe of subscriptions) {
      unsubscribe();
    }
    subscriptions.clear();
  };

  const disconnect: WalletApi["disconnect"] = () => {
    clearSubscriptions();
    setState(initialWalletState);
    if (defaults.persistence.enabled) {
      defaults.persistence.storage.remove(STORAGE_KEYS.connectedWallet);
    }
  };

  const connectAsync: WalletApi["connectAsync"] = async (key, connectConfigOverrides) => {
    const signal: InFlightConnection = { aborted: false };
    inFlightConnections.add(signal);

    try {
      clearSubscriptions();

      setState({ isConnectingTo: key });

      const config: WalletConfig = {
        ...defaults.wallet,
        ...storeConfigOverrides,
        ...connectConfigOverrides,
      };

      const handler: WalletHandler = handleAccountChangeErrors(
        await weldConnect(key, config),
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

      const updateState = async () => {
        const balanceLovelace = await handler.getBalanceLovelace();
        const newState: ConnectedWalletState = {
          isConnected: true,
          isConnectingTo: undefined,
          handler,
          balanceLovelace,
          balanceAda: lovelaceToAda(balanceLovelace),
          networkId: await handler.getNetworkId(),
          rewardAddress: await handler.getStakeAddress(),
          changeAddress: await handler.getChangeAddress(),
          ...handler.info,
        };

        setState(newState);
        return newState;
      };

      const safeUpdateState = () => {
        return updateState().catch((error) => {
          onUpdateError?.(error);
          disconnect();
        });
      };

      const newState = await updateState();

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      if (config.pollInterval) {
        const pollInterval = setInterval(async () => {
          safeUpdateState();
        }, config.pollInterval);
        subscriptions.add(() => {
          clearInterval(pollInterval);
        });
      }

      if (config.updateOnWindowFocus) {
        const listener = async () => {
          safeUpdateState();
        };
        window.addEventListener("focus", listener);
        subscriptions.add(() => {
          window.removeEventListener("focus", listener);
        });
      }

      if (defaults.persistence.enabled) {
        defaults.persistence.storage.set(STORAGE_KEYS.connectedWallet, newState.key);
      }

      return newState;
    } catch (error) {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
      }
      throw error;
    } finally {
      inFlightConnections.delete(signal);
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
    ...initialProps,
    connect,
    connectAsync,
    disconnect,
  };

  initialState.__init = () => {
    if (
      !initialState.isConnectingTo &&
      typeof window !== "undefined" &&
      defaults.persistence.enabled
    ) {
      initialState.isConnectingTo = getPersistedValue("connectedWallet");
    }

    if (initialState.isConnectingTo) {
      connect(initialState.isConnectingTo);
    }
  };

  initialState.__cleanup = () => {
    clearSubscriptions();
    abortInFlightConnections();
  };

  return initialState;
});
