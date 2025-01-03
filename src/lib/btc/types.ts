import type { Provider } from "@sats-connect/core";
import type { BtcWalletDef } from "./handlers/types";

export type BtcExtensionInfo = Provider;

export type BtcApi = unknown;

export type BtcExtension = BtcWalletDef & {
  api: BtcApi;
};
