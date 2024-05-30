import { deleteConnectedWallet } from "@/internal/connected-wallets";
import type { WalletKey } from "@/lib/utils";

export function disconnect(key: WalletKey): void;
export function disconnect(key: string): void;
export function disconnect(key: string): void {
  deleteConnectedWallet(key);
}
