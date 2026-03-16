import type { BtcWalletDef } from "../types";
import { unisatWalletDef } from "./unisat";
import { xverseWalletDef } from "./xverse";

export const SUPPORTED_BTC_WALLETS = {
  [unisatWalletDef.key]: unisatWalletDef,
  [xverseWalletDef.key]: xverseWalletDef,
} satisfies Record<string, BtcWalletDef>;
