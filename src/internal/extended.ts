import type { WalletHandler } from "@/internal/handler";

// biome-ignore lint/complexity/noBannedTypes: To be implemented
export type ExtendedWalletApi = {};

export type ExtendedWalletHandler<THandler extends WalletHandler = WalletHandler> = THandler & {
  extended: ExtendedWalletApi;
};

class DefaultExtendedWalletHandler implements ExtendedWalletApi {
  // @ts-ignore:next-line
  constructor(private _handler: WalletHandler) {}
}

export function extend<THandler extends WalletHandler>(
  handler: THandler,
): ExtendedWalletHandler<THandler> {
  const extendedHandler = handler as ExtendedWalletHandler<THandler>;
  extendedHandler.extended = new DefaultExtendedWalletHandler(handler);
  return extendedHandler;
}
