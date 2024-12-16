import type { BtcExtension } from "@/lib/btc";

export type BtcWalletHandler = {
  getBalance(): Promise<{ btc: bigint }>;
};

export class DefaultBtcWalletHandler implements BtcWalletHandler {
  constructor(private _extension: BtcExtension) {}

  async getBalance(): Promise<{ btc: bigint }> {
    console.log("handle getBalance", this._extension);
    // TODO Implement
    return { btc: 0n };
  }
}
