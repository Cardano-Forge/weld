import type { WeldInstance } from "@/lib/main";
import type { WalletConnector } from "../connector";

export type WeldPlugin = {
  key: string;
  connector?: WalletConnector;
  initialize?(weld: WeldInstance): void | Promise<void>;
};
