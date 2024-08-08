import { type WalletConnector, getDefaultWalletConnector } from "../connector";

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
