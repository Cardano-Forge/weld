import type { UnsubscribeFct } from "@/internal/lifecycle";
import type { MaybePromise } from "@/internal/utils/types";
import type { BitcoinProvider, Provider, SatsConnectAdapter } from "@sats-connect/core";

export type GetBalanceResult = {
  confirmed: number;
  unconfirmed: number;
  total: number;
};

export type BtcWalletEvent = "accountChange" | "networkChange";

export interface BtcWalletHandler {
  getBalance(): Promise<GetBalanceResult>;
  disconnect?(): MaybePromise<void>;
  on?(event: BtcWalletEvent, handler: () => void): UnsubscribeFct;
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
