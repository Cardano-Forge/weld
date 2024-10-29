import { type WalletConnector, getDefaultWalletConnector } from "@/internal/connector";

export type CustomWallet = {
  connector: WalletConnector;
  initialize?(): void | Promise<void>;
};

export function createCustomWallet({ connector, initialize }: Partial<CustomWallet>): CustomWallet {
  return {
    connector: connector ?? getDefaultWalletConnector(),
    initialize,
  };
}
