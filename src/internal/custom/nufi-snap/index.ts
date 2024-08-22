import { initNufiDappCardanoSdk } from "@nufi/dapp-client-cardano";
import nufiCoreSdk from "@nufi/dapp-client-core";

import { createCustomWallet } from "@/internal/custom/type";
import { runOnce } from "@/internal/utils/run-once";

export const nufiSnap = createCustomWallet({
  initialize: runOnce(async () => {
    nufiCoreSdk.init("https://wallet.nu.fi");
    initNufiDappCardanoSdk(nufiCoreSdk, "snap");
    return true;
  }),
});
