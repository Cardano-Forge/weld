import { get } from "@/internal/utils/get";
import {
  type BitcoinProvider,
  DefaultAdaptersInfo,
  type SatsConnectAdapter,
  defaultAdapters,
} from "@sats-connect/core";
import {
  type BtcWalletDef,
  type BtcWalletHandler,
  type GetBalanceResult,
  isBtcProvider,
} from "./types";

class XverseBtcWalletHandler implements BtcWalletHandler {
  constructor(private _ctx: { adapter: SatsConnectAdapter; api: BitcoinProvider }) {}

  async getBalance(): Promise<GetBalanceResult> {
    const res = await this._ctx.adapter.request("getBalance", null);
    if ("error" in res) {
      throw new Error(`Unable to retrieve balance: ${res.error.message}`);
    }
    return {
      unconfirmed: Number(res.result.unconfirmed),
      confirmed: Number(res.result.confirmed),
      total: Number(res.result.total),
    };
  }

  async disconnect(): Promise<void> {
    await this._ctx.adapter.request("wallet_renouncePermissions", null);
  }
}

export const xverseWalletDef: BtcWalletDef = {
  key: "xverse",
  info: DefaultAdaptersInfo.xverse,
  Adapter: defaultAdapters[DefaultAdaptersInfo.xverse.id],
  async connect() {
    const api = get(window, DefaultAdaptersInfo.xverse.id) as BitcoinProvider;
    if (!isBtcProvider(api)) {
      throw new Error("Xverse extension is not installed");
    }
    const adapter = new this.Adapter();
    const curr = await api.request("wallet_getCurrentPermissions", null);
    const hasReadPermissions =
      "result" in curr && curr.result.find((r) => r.type === "account" && r.actions.read);
    if (!hasReadPermissions) {
      await api.request("wallet_requestPermissions", null);
    }
    return new XverseBtcWalletHandler({ adapter, api });
  },
};
