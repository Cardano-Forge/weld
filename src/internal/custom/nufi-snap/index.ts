import { initNufiDappCardanoSdk } from "@nufi/dapp-client-cardano";
import nufiCoreSdk from "@nufi/dapp-client-core";

import { getDefaultWalletConnector } from "@/internal/connector";
import { createCustomWallet } from "@/internal/custom/type";
import { DefaultWalletHandler } from "@/internal/handler";
import { runOnce } from "@/internal/utils/run-once";

class NufiSnapHandler extends DefaultWalletHandler {
  async disconnect(): Promise<void> {
    super.disconnect();
    nufiCoreSdk.getApi().hideWidget();
  }
}

export const nufiSnap = createCustomWallet({
  initialize: runOnce(async () => {
    nufiCoreSdk.init("https://wallet.nu.fi");
    initNufiDappCardanoSdk(nufiCoreSdk, "snap");
    return true;
  }),
  connector: getDefaultWalletConnector(NufiSnapHandler),
});
