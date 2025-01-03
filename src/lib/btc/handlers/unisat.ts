import type { UnsubscribeFct } from "@/internal/lifecycle";
import { DefaultAdaptersInfo, type SatsConnectAdapter, defaultAdapters } from "@sats-connect/core";
import type {
  BtcWalletDef,
  BtcWalletEvent,
  BtcWalletHandler,
  GetBalanceResult,
  SignMessageOpts,
  SignMessageResult,
} from "./types";

type UnisatEvents = {
  accountsChanged: string[];
  networkChanged: string;
};

type SignMessageType = "ecdsa" | "bip322-simple";

export type UnisatApi = {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<GetBalanceResult>;
  disconnect(): Promise<void>;
  signMessage(msg: string, type: SignMessageType): Promise<string>;
  on<TEvent extends keyof UnisatEvents>(
    event: TEvent,
    handler: (data: UnisatEvents[TEvent]) => void,
  ): void;
  removeListener<TEvent extends keyof UnisatEvents>(
    event: TEvent,
    handler: (data: UnisatEvents[TEvent]) => void,
  ): void;
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

  async getPaymentAddress(): Promise<string> {
    const res = await this._ctx.api.getAccounts();
    const paymentAddress = res[0];
    if (!paymentAddress) {
      throw new Error("Unable to retrieve payment address");
    }
    return paymentAddress;
  }

  async getPublicKey(): Promise<string> {
    return this._ctx.api.getPublicKey();
  }

  async signMessage(message: string, opts?: SignMessageOpts): Promise<SignMessageResult> {
    const type: SignMessageType = opts?.protocol === "bip322" ? "bip322-simple" : "ecdsa";
    const signature = await this._ctx.api.signMessage(message, type);
    return { signature };
  }

  async disconnect(): Promise<void> {
    await this._ctx.api.disconnect();
  }

  on?(event: BtcWalletEvent, handler: () => void): UnsubscribeFct {
    if (event === "accountChange") {
      this._ctx.api.on("accountsChanged", handler);
    } else {
      this._ctx.api.on("networkChanged", handler);
    }
    return () => {
      if (event === "accountChange") {
        this._ctx.api.removeListener("accountsChanged", handler);
      } else {
        this._ctx.api.removeListener("networkChanged", handler);
      }
    };
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
