import type { UnsubscribeFct } from "@/internal/lifecycle";
import { base64ToHex } from "@/internal/utils/base64-to-hex";
import { castArray } from "@/internal/utils/cast-array";
import { entries } from "@/internal/utils/entries";
import { get } from "@/internal/utils/get";
import { hexToBase64 } from "@/internal/utils/hex-to-base64";
import {
  AddressPurpose,
  type BitcoinProvider,
  DefaultAdaptersInfo,
  MessageSigningProtocols,
  type SatsConnectAdapter,
  defaultAdapters,
} from "@sats-connect/core";
import {
  type BtcWalletDef,
  type BtcWalletEvent,
  type BtcWalletHandler,
  type GetBalanceResult,
  type GetInscriptionsOpts,
  type GetInscriptionsResult,
  type Inscription,
  type SendBitcoinResult,
  type SignMessageOpts,
  type SignMessageResult,
  type SignPsbtOpts,
  type SignPsbtResult,
  isBtcProvider,
} from "./types";

class XverseBtcWalletHandler implements BtcWalletHandler {
  constructor(private _ctx: { adapter: SatsConnectAdapter; api: BitcoinProvider }) {}

  async getBalance(): Promise<GetBalanceResult> {
    await this.checkPermissions();
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

  async getPaymentAddress(): Promise<string> {
    await this.checkPermissions();
    const res = await this._ctx.adapter.request("getAddresses", {
      purposes: [AddressPurpose.Payment],
    });
    if ("error" in res) {
      throw new Error(`Unable to retrieve balance: ${res.error.message}`);
    }
    const paymentAddress = res.result.addresses[0]?.address;
    if (!paymentAddress) {
      throw new Error("Unable to retrieve payment address");
    }
    return paymentAddress;
  }

  async getPublicKey(): Promise<string> {
    await this.checkPermissions();
    const res = await this._ctx.adapter.request("getAddresses", {
      purposes: [AddressPurpose.Payment],
    });
    if ("error" in res) {
      throw new Error(`Unable to retrieve balance: ${res.error.message}`);
    }
    const publicKey = res.result.addresses[0]?.publicKey;
    if (!publicKey) {
      throw new Error("Unable to retrieve public key");
    }
    return publicKey;
  }

  async getInscriptions({
    limit = 10,
    offset = 0,
  }: GetInscriptionsOpts = {}): Promise<GetInscriptionsResult> {
    const res = await this._ctx.adapter.request("ord_getInscriptions", { limit, offset });
    if ("error" in res) {
      throw new Error(`Unable to retrieve inscriptions: ${res.error.message}`);
    }
    const results: Inscription[] = [];
    for (const inscription of res.result.inscriptions) {
      results.push({
        ...inscription,
        inscriptionNumber: Number(inscription.inscriptionNumber),
        contentLength: Number(inscription.contentLength),
      });
    }
    return {
      total: res.result.total,
      results,
    };
  }

  async signMessage(message: string, opts?: SignMessageOpts): Promise<SignMessageResult> {
    const address = await this.getPaymentAddress();
    const protocol =
      opts?.protocol === "bip322" ? MessageSigningProtocols.BIP322 : MessageSigningProtocols.ECDSA;
    const res = await this._ctx.adapter.request("signMessage", { address, message, protocol });
    if ("error" in res) {
      throw new Error(`Unable to sign message: ${res.error.message}`);
    }
    return { signature: res.result.signature };
  }

  async signPsbt(psbtHex: string, opts: SignPsbtOpts): Promise<SignPsbtResult> {
    const psbtBase64 = hexToBase64(psbtHex);
    const signInputs: Record<string, number[]> = {};
    for (const [key, value] of entries(opts.inputsToSign)) {
      signInputs[key] = castArray(value);
    }
    const res = await this._ctx.adapter.request("signPsbt", { psbt: psbtBase64, signInputs });
    if ("error" in res) {
      throw new Error(`Unable to sign psbt: ${res.error.message}`);
    }
    const signedPsbtHex = base64ToHex(res.result.psbt);
    return { signedPsbtHex };
  }

  async sendBitcoin(toAddress: string, satoshis: number): Promise<SendBitcoinResult> {
    const res = await this._ctx.adapter.request("sendTransfer", {
      recipients: [{ address: toAddress, amount: satoshis }],
    });
    if ("error" in res) {
      throw new Error(`Unable to sends bitcoin: ${res.error.message}`);
    }
    return { txId: res.result.txid };
  }

  async disconnect(): Promise<void> {
    await this._ctx.adapter.request("wallet_renouncePermissions", null);
  }

  on(event: BtcWalletEvent, handler: () => void): UnsubscribeFct {
    return this._ctx.adapter.addListener(event, handler);
  }

  async checkPermissions() {
    const curr = await this._ctx.api.request("wallet_getCurrentPermissions", null);
    const hasReadPermissions =
      "result" in curr && curr.result.find((r) => r.type === "account" && r.actions.read);
    if (!hasReadPermissions) {
      await this._ctx.api.request("wallet_requestPermissions", null);
    }
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
    const handler = new XverseBtcWalletHandler({ adapter, api });
    await handler.checkPermissions();
    return handler;
  },
};
