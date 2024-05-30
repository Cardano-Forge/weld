import type { ExtendedWalletHandler } from "@/internal/extended";
import { type WalletConfig, connect, disconnect, subscribe } from "@/lib/main";
import { type NetworkId, WalletDisconnectAccountError } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

type Wallet = {
  handler: ExtendedWalletHandler;
  balanceLovelace: number;
  networkId: NetworkId;
  rewardAddress: string;
  changeAddress: string;
};

export type UseWalletState =
  | ({
      isConnected: true;
      isConnectedTo?: string;
      isConnectingTo?: string;
    } & Wallet)
  | {
      isConnected: false;
      isConnectedTo?: string;
      isConnectingTo?: string;
    };

export type UseWalletReturnType = {
  wallet: UseWalletState;
  connectWallet: (key: string, config?: Partial<WalletConfig>) => Promise<Wallet | undefined>;
  disconnectWallet: () => void;
};

export type UseWalletOpts = {
  onError?(error: unknown): void;
};

export function useWallet({ onError }: UseWalletOpts = {}): UseWalletReturnType {
  const [isConnectingTo, setConnectingTo] = useState<string>();
  const [wallet, setWallet] = useState<Wallet>();

  const disconnectWallet = useCallback(() => {
    if (!wallet) return;
    disconnect(wallet.handler.info.key);
    setWallet(undefined);
  }, [wallet]);

  const state: UseWalletState = useMemo(() => {
    if (wallet) {
      return {
        isConnected: true,
        isConnectingTo,
        isConnectedTo: wallet.handler.info.key,
        handler: wallet.handler,
        balanceLovelace: wallet.balanceLovelace,
        networkId: wallet.networkId,
        rewardAddress: wallet.rewardAddress,
        changeAddress: wallet.changeAddress,
      };
    }
    return {
      isConnected: false,
      isConnectedTo: "",
      isConnectingTo,
    };
  }, [wallet, isConnectingTo]);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof WalletDisconnectAccountError) {
        disconnectWallet();
      }
      if (onError) {
        onError?.(error);
      } else {
        console.warn(error);
      }
    },
    [disconnectWallet, onError],
  );

  const connectWallet = useCallback(
    async (key: string, config?: Partial<WalletConfig>): Promise<Wallet | undefined> => {
      try {
        setConnectingTo(key);
        const handler = await connect(key, config);
        const wallet: Wallet = {
          handler,
          balanceLovelace: await handler.getBalanceLovelace(),
          networkId: await handler.getNetworkId(),
          rewardAddress: await handler.getStakeAddress(),
          changeAddress: await handler.getChangeAddress(),
        };
        setWallet(wallet);
        return wallet;
      } catch (error) {
        handleError(error);
        return undefined;
      } finally {
        setConnectingTo(undefined);
      }
    },
    [handleError],
  );

  useEffect(() => {
    if (!wallet) return;
    const balanceSub = subscribe(
      `weld:wallet.balance.update.${wallet.handler.info.key}`,
      async (event) => {
        const balanceLovelace = event.data.balanceLovelace;
        if (!balanceLovelace) return;
        setWallet((prev) => (prev ? { ...prev, balanceLovelace } : undefined));
      },
    );
    const rewardAddressSub = subscribe(
      `weld:wallet.reward-address.update.${wallet.handler.info.key}`,
      async (event) => {
        const rewardAddress = event.data.rewardAddress;
        setWallet((prev) => (prev ? { ...prev, rewardAddress } : undefined));
      },
    );
    const changeAddressSub = subscribe(
      `weld:wallet.change-address.update.${wallet.handler.info.key}`,
      async (event) => {
        const changeAddress = event.data.changeAddress;
        setWallet((prev) => (prev ? { ...prev, changeAddress } : undefined));
      },
    );
    const networkSub = subscribe(
      `weld:wallet.network.update.${wallet.handler.info.key}`,
      async (event) => {
        const networkId = event.data.networkId;
        setWallet((prev) => (prev ? { ...prev, networkId } : undefined));
      },
    );
    return () => {
      balanceSub.unsubscribe();
      rewardAddressSub.unsubscribe();
      changeAddressSub.unsubscribe();
      networkSub.unsubscribe();
    };
  }, [wallet]);

  useEffect(() => {
    if (!wallet) return;
    const sub = subscribe(`weld:wallet.update.error.${wallet.handler.info.key}`, (event) => {
      handleError(event.data.error);
    });
    return () => sub.unsubscribe();
  }, [wallet, handleError]);

  return { wallet: state, connectWallet, disconnectWallet };
}
