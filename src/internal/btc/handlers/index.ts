import { get } from "@/internal/utils/get";
import {
  type BitcoinProvider,
  DefaultAdaptersInfo,
  type Provider,
  type SatsConnectAdapter,
  defaultAdapters,
} from "@sats-connect/core";

export type GetBalanceResult = {
  confirmed: number;
  unconfirmed: number;
  total: number;
};

export interface BtcWalletHandler {
  getBalance(): Promise<GetBalanceResult>;
}

export type WindowUnisat = {
  requestAccounts(): Promise<string[]>;
  getBalance(): Promise<GetBalanceResult>;
};

declare global {
  interface Window {
    unisat?: WindowUnisat;
  }
}

function isBtcProvider(obj: unknown): obj is BitcoinProvider {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

export type BtcWallet = {
  key: string;
  info: Provider;
  Adapter: new () => SatsConnectAdapter;
  connect(): Promise<BtcWalletHandler>;
};

export class UnisatBtcWalletHandler implements BtcWalletHandler {
  constructor(
    private _api: WindowUnisat,
    private _address: string,
  ) {}

  getAddress(): string {
    return this._address;
  }

  async getBalance(): Promise<GetBalanceResult> {
    return this._api.getBalance();
  }
}

export class XverseBtcWalletHandler implements BtcWalletHandler {
  constructor(private _api: BitcoinProvider) {}

  async getBalance(): Promise<GetBalanceResult> {
    const res = await this._api.request("getBalance", null);
    if ("error" in res) {
      throw new Error(`Unable to retrieve balance: ${res.error.message}`);
    }
    return {
      unconfirmed: Number(res.result.unconfirmed),
      confirmed: Number(res.result.confirmed),
      total: Number(res.result.total),
    };
  }
}

export const btcWallets = {
  unisat: {
    key: "unisat",
    info: DefaultAdaptersInfo.unisat,
    Adapter: defaultAdapters[DefaultAdaptersInfo.unisat.id],
    async connect() {
      const api = window.unisat;
      if (!api) {
        throw new Error("Unisat extension is not installed");
      }
      const accounts = await api.requestAccounts();
      const address = accounts[0];
      if (!address) {
        throw new Error("Couldn't retrieve current unisat account");
      }
      return new UnisatBtcWalletHandler(api, address);
    },
  },
  xverse: {
    key: "xverse",
    info: DefaultAdaptersInfo.xverse,
    Adapter: defaultAdapters[DefaultAdaptersInfo.xverse.id],
    async connect() {
      const api = get(window, DefaultAdaptersInfo.xverse.id) as BitcoinProvider;
      if (!isBtcProvider(api)) {
        throw new Error("Xverse extension is not installed");
      }
      const curr = await api.request("wallet_getCurrentPermissions", null);
      const hasReadPermissions =
        "result" in curr && curr.result.find((r) => r.type === "account" && r.actions.read);
      if (!hasReadPermissions) {
        await api.request("wallet_requestPermissions", null);
      }
      return new XverseBtcWalletHandler(api);
    },
  },
} satisfies Record<string, BtcWallet>;
