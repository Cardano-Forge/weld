import type { BtcWalletDef } from "@/internal/btc/handlers/types";
import type { Provider } from "@sats-connect/core";

export type BtcExtensionInfo = Provider;

export type BtcApi = unknown;

export type BtcExtension = BtcWalletDef & {
  api: BtcApi;
};
