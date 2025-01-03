import type { MaybePromise } from "@/internal/utils/types";
import type { BitcoinProvider, Provider, SatsConnectAdapter } from "@sats-connect/core";

export type GetBalanceResult = {
  confirmed: number;
  unconfirmed: number;
  total: number;
};

export interface BtcWalletHandler {
  getBalance(): Promise<GetBalanceResult>;
  disconnect?(): MaybePromise<void>;
}

export function isBtcProvider(obj: unknown): obj is BitcoinProvider {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

export type BtcWalletDef = {
  key: string;
  info: Provider;
  Adapter: new () => SatsConnectAdapter;
  connect(): Promise<BtcWalletHandler>;
};
