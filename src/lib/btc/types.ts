import type { BtcWallet } from "@/internal/btc/handlers";
import type { Provider } from "@sats-connect/core";

export type BtcExtensionInfo = Provider;

export type BtcApi = unknown;

export type BtcExtension = BtcWallet & {
  api: BtcApi;
};
