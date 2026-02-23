import type { WalletConnector } from "../connector";

export type WeldPlugin = {
  key: string;
  connector?: WalletConnector;
  initialize?(): void | Promise<void>;
};
