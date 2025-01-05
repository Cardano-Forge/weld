import type { UnsubscribeFct } from "@/internal/lifecycle";
import { castArray } from "@/internal/utils/cast-array";
import { entries } from "@/internal/utils/entries";
import { DefaultAdaptersInfo, type SatsConnectAdapter, defaultAdapters } from "@sats-connect/core";
import type {
  BtcWalletDef,
  BtcWalletEvent,
  BtcWalletHandler,
  GetBalanceResult,
  GetInscriptionsOpts,
  GetInscriptionsResult,
  SendBitcoinResult,
  SendInscriptionResult,
  SignMessageOpts,
  SignMessageResult,
  SignPsbtOpts,
  SignPsbtResult,
} from "../types";

type UnisatEvents = {
  accountsChanged: string[];
  networkChanged: string;
};

type SignMessageType = "ecdsa" | "bip322-simple";

type ToSignInput = {
  address: string;
  index: number;
};

type Inscription = {
  inscriptionId: string;
  inscriptionNumber: number;
  address: string;
  outputValue: number;
  preview: string;
  content: string;
  contentLength: number;
  contentType: string;
  timestamp: number;
  genesisTransaction: string;
  location: string;
  output: string;
  offset: number;
};

export type UnisatApi = {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<GetBalanceResult>;
  getInscriptions(cursor: number, size: number): Promise<{ total: number; list: Inscription[] }>;
  disconnect(): Promise<void>;
  signMessage(msg: string, type: SignMessageType): Promise<string>;
  signPsbt(psbtHex: string, opts: { toSignInputs: ToSignInput[] }): Promise<string>;
  sendBitcoin(toAddress: string, satoshis: number): Promise<string>;
  sendInscription(toAddress: string, inscriptionId: string): Promise<string>;
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

  async getInscriptions({
    limit = 10,
    offset = 0,
  }: GetInscriptionsOpts = {}): Promise<GetInscriptionsResult> {
    const res = await this._ctx.api.getInscriptions(offset, limit);
    return {
      total: res.total,
      results: res.list,
    };
  }

  async sendInscription(toAddress: string, inscriptionId: string): Promise<SendInscriptionResult> {
    const txId = await this._ctx.api.sendInscription(toAddress, inscriptionId);
    return { txId };
  }

  async signMessage(message: string, opts?: SignMessageOpts): Promise<SignMessageResult> {
    const type: SignMessageType = opts?.protocol === "bip322" ? "bip322-simple" : "ecdsa";
    const signature = await this._ctx.api.signMessage(message, type);
    return { signature };
  }

  async signPsbt(psbtHex: string, opts: SignPsbtOpts): Promise<SignPsbtResult> {
    const toSignInputs: ToSignInput[] = [];
    for (const [address, indexes] of entries(opts.inputsToSign)) {
      for (const index of castArray(indexes)) {
        toSignInputs.push({ address, index });
      }
    }
    const signedPsbtHex = await this._ctx.api.signPsbt(psbtHex, { toSignInputs });
    return { signedPsbtHex };
  }

  async sendBitcoin(toAddress: string, satoshis: number): Promise<SendBitcoinResult> {
    const txId = await this._ctx.api.sendBitcoin(toAddress, satoshis);
    return { txId };
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

export const unisatWalletDef = {
  key: "unisat" as const,
  info: DefaultAdaptersInfo.unisat,
  Adapter: defaultAdapters[DefaultAdaptersInfo.unisat.id],
  async connect() {
    const api = window.unisat;
    if (!api) {
      throw new Error("Unisat extension is not installed");
    }
    await api.requestAccounts();
    const adapter = new this.Adapter();
    return new UnisatBtcWalletHandler({ adapter, api }) as BtcWalletHandler;
  },
} satisfies BtcWalletDef;
