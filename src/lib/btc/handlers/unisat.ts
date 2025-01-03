import { DefaultAdaptersInfo, type SatsConnectAdapter, defaultAdapters } from "@sats-connect/core";
import type { BtcWalletDef, BtcWalletHandler, GetBalanceResult } from "./types";

export type UnisatApi = {
  requestAccounts(): Promise<string[]>;
  getBalance(): Promise<GetBalanceResult>;
  disconnect(): Promise<void>;
};

declare global {
  interface Window {
    unisat?: UnisatApi;
  }
}

export class UnisatBtcWalletHandler implements BtcWalletHandler {
  constructor(private _ctx: { adapter: SatsConnectAdapter; api: UnisatApi }) {}

  async getBalance(): Promise<GetBalanceResult> {
    return this._ctx.api.getBalance();
  }

  async disconnect(): Promise<void> {
    await this._ctx.api.disconnect();
  }
}

export const unisatWalletDef: BtcWalletDef = {
  key: "unisat",
  info: DefaultAdaptersInfo.unisat,
  Adapter: defaultAdapters[DefaultAdaptersInfo.unisat.id],
  async connect() {
    const api = window.unisat;
    if (!api) {
      throw new Error("Unisat extension is not installed");
    }
    await api.requestAccounts();
    const adapter = new this.Adapter();
    return new UnisatBtcWalletHandler({ adapter, api });
  },
};
