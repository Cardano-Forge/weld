import type { ExtendedWalletHandler } from "@/internal/extended";
import { type Store, type StoreLifeCycleMethods, createStore } from "@/internal/store";
import {
  type NetworkId,
  WalletDisconnectAccountError,
  type WalletInfo,
  lovelaceToAda,
} from "@/lib/utils";
import type { WalletConfig } from "../config";
import { connect as weldConnect } from "../connect";
import { disconnect as weldDisconnect } from "../disconnect";
import { getPersistedValue } from "../persistence";
import { subscribe } from "../subscribe";

type WalletProps = WalletInfo & {
  isConnectingTo: string | undefined;
  handler: ExtendedWalletHandler;
  balance: { lovelace: number; ada: number };
  rewardAddress: string;
  changeAddress: string;
  networkId: NetworkId;
};

const initialWalletState: WalletState = {
  isConnected: false,
  isConnectingTo: undefined,
  handler: undefined,
  balance: undefined,
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

export type WalletStore = Store<WalletState & WalletApi>;

export type CreateWalletStoreOpts = Partial<Pick<WalletProps, "isConnectingTo">> & {
  onUpdateError?(error: unknown): void;
};

export function createWalletStore({
  onUpdateError,
  ...initialProps
}: CreateWalletStoreOpts = {}): Store<WalletState & WalletApi> {
  return createStore<WalletState & WalletApi>((setState, getState) => {
    const subscriptions = new Set<{ unsubscribe(): void }>();

    const unsubscribe = () => {
      if (subscriptions.size === 0) {
        return;
      }
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
      subscriptions.clear();
    };

    const disconnect: WalletApi["disconnect"] = () => {
      unsubscribe();
      const state = getState();
      if (!state.isConnected) {
        return;
      }
      weldDisconnect(state.handler.info.key);
      setState(initialWalletState);
    };

    const handleError = (error: unknown) => {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
      }
    };

    const initializeSubscriptions = () => {
      unsubscribe();
      subscriptions.add(
        subscribe("weld:wallet.balance.update.*", (event) => {
          const state = getState();
          if (state.key !== event.key) return;
          const { balanceLovelace } = event.data;
          if (typeof balanceLovelace === "number" && state.balance?.lovelace !== balanceLovelace) {
            const balance = { lovelace: balanceLovelace, ada: lovelaceToAda(balanceLovelace) };
            setState({ balance });
          }
        }),
      );
      subscriptions.add(
        subscribe("weld:wallet.change-address.update.*", (event) => {
          const state = getState();
          if (state.key !== event.key) return;
          const { changeAddress } = event.data;
          if (state.changeAddress !== changeAddress) {
            setState({ changeAddress });
          }
        }),
      );
      subscriptions.add(
        subscribe("weld:wallet.reward-address.update.*", (event) => {
          const state = getState();
          if (state.key !== event.key) return;
          const { rewardAddress } = event.data;
          if (state.rewardAddress !== rewardAddress) {
            setState({ rewardAddress });
          }
        }),
      );
      subscriptions.add(
        subscribe("weld:wallet.network.update.*", (event) => {
          const state = getState();
          if (state.key !== event.key) return;
          const { networkId } = event.data;
          if (state.networkId !== networkId) {
            setState({ networkId });
          }
        }),
      );
      subscriptions.add(
        subscribe("weld:wallet.update.error.*", (event) => {
          const state = getState();
          if (state.key !== event.key) return;
          const { error } = event.data;
          handleError(error);
          onUpdateError?.(error);
        }),
      );
    };

    const connectAsyncRaw: WalletApi["connectAsync"] = async (key, config) => {
      setState({ isConnectingTo: key });

      const handler = await weldConnect(key, config);
      const balanceLovelace = await handler.getBalanceLovelace();
      const newState: ConnectedWalletState = {
        isConnected: true,
        isConnectingTo: undefined,
        handler,
        balance: {
          lovelace: balanceLovelace,
          ada: lovelaceToAda(balanceLovelace),
        },
        networkId: await handler.getNetworkId(),
        rewardAddress: await handler.getStakeAddress(),
        changeAddress: await handler.getChangeAddress(),
        ...handler.info,
      };

      handler.initialize();
      initializeSubscriptions();

      setState(newState);

      return newState;
    };

    const connectAsync: WalletApi["connectAsync"] = async (key, config) => {
      try {
        return await connectAsyncRaw(key, config);
      } catch (error) {
        handleError(error);
        setState({ isConnectingTo: undefined });
        throw error;
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

    const initialState: WalletState & WalletApi = {
      ...initialWalletState,
      ...initialProps,
      connect,
      connectAsync,
      disconnect,
    };
    if (!initialState.isConnectingTo && typeof window !== "undefined") {
      initialState.isConnectingTo = getPersistedValue("connectedWallet");
    }

    let reconnectTimeout: NodeJS.Timeout | undefined = undefined;

    const clearReconnectTimeout = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = undefined;
      }
    };

    const reconnect = async (key: string, retryCount = 0) => {
      try {
        if (getState()?.isConnected) {
          return;
        }
        await connectAsyncRaw(key);
      } catch (error) {
        if (retryCount < 4) {
          clearReconnectTimeout();
          reconnectTimeout = setTimeout(() => {
            reconnect(key, retryCount + 1);
          }, 500);
        } else if (!getState()?.isConnected) {
          connect(key);
        }
      }
    };

    const __init = () => {
      if (initialState.isConnectingTo) {
        reconnect(initialState.isConnectingTo);
      }
    };

    const __cleanup = () => {
      clearReconnectTimeout();
      unsubscribe();
    };

    (initialState as StoreLifeCycleMethods).__init = __init;
    (initialState as StoreLifeCycleMethods).__cleanup = __cleanup;

    return initialState;
  });
}
