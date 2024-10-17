import type { WalletInfo } from "@/lib/main/utils/wallets";

import { type WalletProps, newWalletStoreCreator, type WalletApi } from "./wallet";
import type { WalletHandler } from "@/internal/handler";
import type { NetworkId } from "@/lib/main/utils/extensions";

type CardanoWalletProps = WalletProps<
  WalletInfo & {
    isConnected: boolean;
    isConnecting: boolean;
    isConnectingTo: string | undefined;
    handler: WalletHandler;
    balanceLovelace: number;
    balanceAda: number;
    changeAddressHex: string;
    changeAddressBech32: string;
    stakeAddressHex: string;
    stakeAddressBech32: string;
    networkId: NetworkId;
    isUpdatingUtxos: boolean;
    utxos: string[];
  }
>;

export const newCardanoWalletStore = newWalletStoreCreator<
  CardanoWalletProps,
  WalletApi<Record<string, unknown>>
>((ctx) => {
  const state = ctx.getState();
  console.log("state", state);
  ctx.setState({
    isConnecting: false,
  });

  return {
    newState() {
      return {
        isConnected: false,
        isConnecting: false,
        isConnectingTo: undefined,
        handler: undefined,
        balanceLovelace: undefined,
        balanceAda: undefined,
        changeAddressHex: undefined,
        changeAddressBech32: undefined,
        stakeAddressHex: undefined,
        stakeAddressBech32: undefined,
        networkId: undefined,
        supported: undefined,
        key: undefined,
        icon: undefined,
        website: undefined,
        displayName: undefined,
        supportsTxChaining: undefined,
        isUpdatingUtxos: false,
        utxos: undefined,
      };
    },
    storageKey: "connectedWallet",
    updateState() {},
    api: {},
  };
});
