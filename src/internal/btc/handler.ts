import type { BtcExtension } from "@/lib/btc";

const baseUrls = {
  xverse: "https://btc-testnet.xverse.app",
  mempool: "https://mempool.space/testnet/api",
};

export type BtcWalletHandler = {
  getBalance(): Promise<{ btc: number }>;
  getAddress(): Promise<string | null>;
};

export class DefaultBtcWalletHandler implements BtcWalletHandler {
  constructor(private _extension: BtcExtension) {}

  async getBalance(): Promise<{ btc: number }> {
    console.log("get balance");
    if (this._extension.info.methods?.includes("getBalance")) {
      const res = await this._extension.api.request("getBalance");
      if ("error" in res) {
        throw res.error;
      }
      return {
        btc: Number(res.result.total ?? 0),
      };
    }
    const address = await this.getAddress();
    const res = await fetch(`${baseUrls.xverse}/address/${address}`);
    const json: unknown = await res.json();
    if (!isAddressInfoResult(json)) {
      throw new Error("Invalid json response");
    }
    // @src https://github.com/Adamant-im/adamant-im/blob/4ea7c6f95f875672e7320c08fb4b8ebe4c4399c4/src/lib/bitcoin/bitcoin-api.js#L15
    const btc = Math.floor(
      Number(json.chain_stats.funded_txo_sum) - Number(json.chain_stats.spent_txo_sum),
    );
    return { btc };
  }

  private _address: string | null | undefined = undefined;
  async getAddress(): Promise<string | null> {
    if (typeof this._address !== "undefined") {
      return this._address;
    }
    const res = await this._extension.api
      .request("getAddresses", { purposes: ["payment"] })
      .catch((error) => ({ error }));
    if ("error" in res) {
      this._address = null;
      throw res.error;
    }
    const address = res.result.addresses.find((addr) => {
      const type = addr.type ?? addr.addressType;
      return type === "p2wpkh";
    });
    this._address = address?.address ?? null;
    return this._address;
  }
}

type AddressInfoResult = {
  chain_stats: {
    funded_txo_sum: string | number;
    spent_txo_sum: string | number;
  };
};

function isAddressInfoResult(obj: unknown): obj is AddressInfoResult {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "chain_stats" in obj &&
    typeof obj.chain_stats === "object" &&
    obj.chain_stats !== null &&
    "funded_txo_sum" in obj.chain_stats &&
    "spent_txo_sum" in obj.chain_stats
  );
}
