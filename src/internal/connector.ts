import { WalletConnectionError, enableWallet, getWalletInfo, getWindowCardano } from "@/lib/utils";

import { DefaultWalletHandler, type WalletHandler } from "@/internal/handler";
import type { WalletConfig } from "@/lib/main";

export type WalletConnector = (key: string, config: WalletConfig) => Promise<WalletHandler>;

export function createWalletConnector<T extends WalletConnector>(c: T): T {
  return c;
}

export function getDefaultWalletConnector(): (
  key: string,
  config: WalletConfig,
) => Promise<DefaultWalletHandler>;
export function getDefaultWalletConnector<TConstructor extends typeof DefaultWalletHandler>(
  HandlerConstructor: TConstructor,
): (key: string, config: WalletConfig) => Promise<InstanceType<TConstructor>>;
export function getDefaultWalletConnector<TConstructor extends typeof DefaultWalletHandler>(
  HandlerConstructor?: TConstructor,
) {
  return async (key: string, config: WalletConfig): Promise<InstanceType<TConstructor>> => {
    const defaultApi = await getWindowCardano({ key });
    if (!defaultApi) {
      const message = "Could not retrieve the wallet API";
      throw new WalletConnectionError(message);
    }

    const info = getWalletInfo({ key, defaultApi });

    const enable = () => enableWallet(defaultApi);

    const enabledApi = await enable();
    if (!enabledApi) {
      const message = "Could not enable the wallet";
      throw new WalletConnectionError(message);
    }

    let handler: DefaultWalletHandler;
    if (HandlerConstructor) {
      handler = new HandlerConstructor(info, defaultApi, enabledApi, config, enable);
    } else {
      handler = new DefaultWalletHandler(info, defaultApi, enabledApi, config, enable);
    }

    return handler as InstanceType<TConstructor>;
  };
}
