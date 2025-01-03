import type { BtcWalletDef } from "./types";
import { unisatWalletDef } from "./unisat";
import { xverseWalletDef } from "./xverse";

export const supportedBtcWallets: Record<string, BtcWalletDef> = {
  [unisatWalletDef.key]: unisatWalletDef,
  [xverseWalletDef.key]: xverseWalletDef,
};
