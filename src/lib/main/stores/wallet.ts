import type { WalletHandler } from "@/internal/handler";
import { type Store, type StoreLifeCycleMethods, createStore } from "@/internal/store";
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

export type WalletStoreState = WalletState & WalletApi;
export type WalletStore = Store<WalletStoreState>;

export type CreateWalletStoreOpts = Partial<Pick<WalletProps, "isConnectingTo">> & {
  onUpdateError?(error: unknown): void;
};

type InFlightConnection = {
  aborted: boolean;
};

export function createWalletStore(
  { onUpdateError, ...initialProps }: CreateWalletStoreOpts = {},
  storeConfigOverrides?: Partial<WalletConfig>,
): WalletStore {
  console.log("\n\ncreate wallet store\n\n");
  return createStore<WalletStoreState>((setState) => {
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
    };

    const handleError = (error: unknown) => {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
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

        const handler = await weldConnect(key, config);

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const updateState = async () => {
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

          setState(newState);
          return newState;
        };

        const newState = await updateState();

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        if (config.pollInterval) {
          const pollInterval = setInterval(() => {
            console.log("updating state on interval");
            updateState();
          }, config.pollInterval);
          subscriptions.add(() => {
            console.log("stop polling");
            clearInterval(pollInterval);
          });
        }

        if (config.updateOnWindowFocus) {
          const listener = () => {
            console.log("updating state on window focus");
            updateState();
          };
          window.addEventListener("focus", listener);
          subscriptions.add(() => {
            console.log("stop listening for focus events");
            window.removeEventListener("focus", listener);
          });
        }

        return newState;
      } catch (error) {
        handleError(error);
        disconnect();
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

    if (!initialState.isConnectingTo && typeof window !== "undefined") {
      initialState.isConnectingTo = getPersistedValue("connectedWallet");
    }

    initialState.__init = () => {
      if (initialState.isConnectingTo) {
        console.log("autoconnect:", initialState.isConnectingTo);
        connect(initialState.isConnectingTo);
      }
    };

    initialState.__cleanup = () => {
      console.log("cleanup!");
      clearSubscriptions();
      abortInFlightConnections();
    };

    return initialState;
  });
}
