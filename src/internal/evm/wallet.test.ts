import { createConfigStore } from "@/lib/main/stores/config";
import { mock } from "@depay/web3-mock";
import { beforeEach, describe, it } from "vitest";
import { createEvmExtensionsStore } from "./extensions";
import type { EvmExtensionInfo } from "./types";
import { createEvmWalletStore } from "./wallet";

const walletKey = "metamask";
const balanceWei = "232111122321";
const account = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

const supportedExtensions: EvmExtensionInfo[] = [
  {
    key: walletKey,
    displayName: "Metamask",
    path: "ethereum",
  },
];

beforeEach(() => {
  mock({
    blockchain: "ethereum",
    accounts: { return: [account] },
    balance: {
      for: account,
      return: balanceWei,
    },
    network: { switchTo: "ethereum" },
  });
});

function newTestStores() {
  const extensions = createEvmExtensionsStore(supportedExtensions);
  const config = createConfigStore();
  const wallet = createEvmWalletStore({
    chain: "eth",
    extensions,
    config,
    storageKey: "connectedEthWallet",
  });
  return { extensions, config, wallet };
}

describe("createEvmWalletStore.connectAsync", () => {
  it("should connect to valid installed wallets successfully", async () => {
    const { extensions, config, wallet } = newTestStores();
    const connected = await wallet.getState().connectAsync(walletKey);
    console.log("connected", connected);
  });
});
