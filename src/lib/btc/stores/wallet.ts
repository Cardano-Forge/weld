import type { BtcWalletHandler } from "@/internal/btc/handlers/types";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  type DefaultWalletStoreProps,
  WalletStoreManager,
  type WalletStorePersistData,
} from "@/internal/wallet-store";
import { WalletConnectionAbortedError, WalletConnectionError } from "@/lib/main";
import type { WalletConfig } from "@/lib/main/stores/config";
import { weldBtc } from ".";
import type { BtcApi, BtcExtensionInfo } from "../types";

export type BtcWalletProps = DefaultWalletStoreProps &
  BtcExtensionInfo & {
    isConnected: boolean;
    isConnecting: boolean;
    isConnectingTo: string | undefined;
    balanceBtc: number;
    api: BtcApi;
    handler: BtcWalletHandler;
  };

function newBtcWalletState(): PartialWithDiscriminant<BtcWalletProps, "isConnected"> {
  return {
    id: undefined,
    key: undefined,
    name: undefined,
    icon: undefined,
    webUrl: undefined,
    chromeWebStoreUrl: undefined,
    mozillaAddOnsUrl: undefined,
    googlePlayStoreUrl: undefined,
    iOSAppStoreUrl: undefined,
    methods: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
    balanceBtc: undefined,
    api: undefined,
    handler: undefined,
  };
}

export type ConnectBtcWalletCallbacks = {
  onSuccess(wallet: ConnectedBtcWalletState): void;
  onError(error: unknown): void;
};

export type BtcWalletApi = {
  connect(key: string, config?: Partial<WalletConfig & ConnectBtcWalletCallbacks>): void;
  connectAsync: (key: string, config?: Partial<WalletConfig>) => Promise<ConnectedBtcWalletState>;
  disconnect(): void;
};

export type BtcWalletState<TKeys extends keyof BtcWalletProps = keyof BtcWalletProps> =
  PartialWithDiscriminant<BtcWalletProps, "isConnected", TKeys>;

export type ConnectedBtcWalletState = Extract<BtcWalletState, { isConnected: true }>;
export type DiconnectedBtcWalletState = Extract<BtcWalletState, { isConnected: false }>;

export type BtcWalletStoreState<
  TKeys extends keyof BtcWalletProps | keyof BtcWalletApi =
    | keyof BtcWalletProps
    | keyof BtcWalletApi,
> = BtcWalletState<Extract<TKeys, keyof BtcWalletProps>> & {
  [TKey in Extract<TKeys, keyof BtcWalletApi>]: BtcWalletApi[TKey];
};

export type BtcWalletStore = Store<BtcWalletStoreState, WalletStorePersistData> &
  BtcWalletStoreState;

export type CreateBtcWalletStoreOpts = {
  lifecycle?: LifeCycleManager;
  extensions?: typeof weldBtc.extensions;
  config?: typeof weldBtc.config;
};

export const createBtcWalletStore = createStoreFactory<
  BtcWalletStoreState,
  WalletStorePersistData,
  [] | [CreateBtcWalletStoreOpts]
>(
  (
    setState,
    getState,
    {
      lifecycle = new LifeCycleManager(),
      extensions = weldBtc.extensions,
      config = weldBtc.config,
    } = {},
  ) => {
    const walletManager = new WalletStoreManager<BtcWalletState>(
      setState,
      getState,
      newBtcWalletState,
      async (key, opts) => {
        // Make sure the extensions are loaded
        await extensions.updateExtensions();
        const extension = extensions.installedMap.get(key);

        if (!extension) {
          throw new WalletConnectionError(`The ${key} extension is not installed`);
        }

        if (opts.signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const handler = await extension.connect();

        const updateState = async () => {
          const balance = await handler.getBalance();

          const newState: ConnectedBtcWalletState = {
            ...extension.info,
            key: extension.key,
            isConnected: true,
            isConnecting: false,
            isConnectingTo: undefined,
            api: extension.api,
            balanceBtc: balance.total,
            handler,
          };

          if (opts.signal.aborted) {
            return;
          }

          setState(newState);
        };

        return {
          updateState,
        };
      },
      "connectedBtcWallet",
      config,
      lifecycle,
    ).on("beforeDisconnect", async () => {
      await getState().handler?.disconnect?.();
    });

    const connectAsync = (async (key, configOverrides, signal?: InFlightSignal) => {
      await walletManager.disconnect();
      return walletManager.connect(key, { configOverrides, signal });
    }) satisfies BtcWalletApi["connectAsync"];

    const connect: BtcWalletApi["connect"] = async (
      key,
      { onSuccess, onError, ...config } = {},
    ) => {
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

    const initialState: BtcWalletStoreState &
      StoreSetupFunctions & { __mngr: typeof walletManager } = {
      ...newBtcWalletState(),
      connect,
      connectAsync,
      disconnect,
      __init,
      __cleanup,
      __persist,
      __mngr: walletManager,
    };

    return initialState as BtcWalletStoreState;
  },
);
