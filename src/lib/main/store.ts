import type { ExtendedWalletHandler } from "@/internal/extended";
import { type Store, createStore } from "@/internal/store";
import {
  type NetworkId,
  WalletDisconnectAccountError,
  type WalletInfo,
  lovelaceToAda,
} from "@/lib/utils";
import type { WalletConfig } from "./config";
import { connect as weldConnect } from "./connect";
import { disconnect as weldDisconnect } from "./disconnect";
import { subscribe } from "./subscribe";

type WalletProps = WalletInfo & {
  isConnectingTo: string | undefined;
  handler: ExtendedWalletHandler;
  balance: { lovelace: number; ada: number };
  rewardAddress: string;
  changeAddress: string;
  networkId: NetworkId;
};

const initialState: WalletState = {
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
  cleanup(): void;
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

export function createWalletStore({ onUpdateError, ...initialProps }: CreateWalletStoreOpts = {}) {
  return createStore<WalletState & WalletApi>((setState, getState) => {
    const subscriptions = new Set<{ unsubscribe(): void }>();

    const cleanup: WalletApi["cleanup"] = () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
      subscriptions.clear();
    };

    const disconnect: WalletApi["disconnect"] = () => {
      cleanup();
      const state = getState();
      if (!state.isConnected) {
        return;
      }
      weldDisconnect(state.handler.info.key);
      setState(initialState);
    };

    const handleError = (error: unknown) => {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
      }
    };

    const initializeSubscriptions = () => {
      cleanup();
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

    const connectAsync: WalletApi["connectAsync"] = async (key, config) => {
      try {
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
      } catch (error) {
        handleError(error);
        throw error;
      } finally {
        setState({ isConnectingTo: undefined });
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

    const isServer = typeof window === "undefined";
    if (initialProps.isConnectingTo && !isServer) {
      connect(initialProps.isConnectingTo);
    }

    return {
      ...initialState,
      ...initialProps,
      connect,
      connectAsync,
      cleanup,
      disconnect,
    };
  });
}
