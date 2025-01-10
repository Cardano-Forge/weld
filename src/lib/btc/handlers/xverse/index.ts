import type { UnsubscribeFct } from "@/internal/lifecycle";
import { base64ToHex } from "@/internal/utils/base64-to-hex";
import { castArray } from "@/internal/utils/cast-array";
import { entries } from "@/internal/utils/entries";
import { get } from "@/internal/utils/get";
import { hexToBase64 } from "@/internal/utils/hex-to-base64";
import { noop } from "@/internal/utils/noop";
import type {
  BtcWalletDef,
  BtcWalletEvent,
  BtcWalletHandler,
  GetBalanceResult,
  GetInscriptionsOpts,
  GetInscriptionsResult,
  Inscription,
  SendBitcoinResult,
  SendInscriptionResult,
  SignMessageOpts,
  SignMessageResult,
  SignPsbtOpts,
  SignPsbtResult,
} from "../../types";
import { type Protocol, type XverseApi, isXverseApi } from "./types";

class XverseBtcWalletHandler implements BtcWalletHandler {
  constructor(private _ctx: { api: XverseApi }) {}

  async getBalance(): Promise<GetBalanceResult> {
    await this.checkPermissions();
    const res = await this._ctx.api.request("getBalance", null);
    if ("error" in res) {
      throw new Error(`Unable to retrieve balance: ${res.error}`);
    }
    return {
      unconfirmed: Number(res.result.unconfirmed),
      confirmed: Number(res.result.confirmed),
      total: Number(res.result.total),
    };
  }

  async getPaymentAddress(): Promise<string> {
    await this.checkPermissions();
    const res = await this._ctx.api.request("getAddresses", { purposes: ["payment"] });
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
    const res = await this._ctx.api.request("getAddresses", { purposes: ["payment"] });
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
    const res = await this._ctx.api.request("ord_getInscriptions", { limit, offset });
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

  async sendInscription(toAddress: string, inscriptionId: string): Promise<SendInscriptionResult> {
    const res = await this._ctx.api.request("ord_sendInscriptions", {
      transfers: [{ address: toAddress, inscriptionId }],
    });
    if ("error" in res) {
      throw new Error(`Unable to retrieve inscriptions: ${res.error.message}`);
    }
    return {
      txId: res.result.txid,
    };
  }

  async signMessage(message: string, opts?: SignMessageOpts): Promise<SignMessageResult> {
    const address = await this.getPaymentAddress();
    const protocol: Protocol = opts?.protocol === "bip322" ? "BIP322" : "ECDSA";
    const res = await this._ctx.api.request("signMessage", { address, message, protocol });
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
    const res = await this._ctx.api.request("signPsbt", { psbt: psbtBase64, signInputs });
    if ("error" in res) {
      throw new Error(`Unable to sign psbt: ${res.error.message}`);
    }
    const signedPsbtHex = base64ToHex(res.result.psbt);
    return { signedPsbtHex };
  }

  async sendBitcoin(toAddress: string, satoshis: number): Promise<SendBitcoinResult> {
    const res = await this._ctx.api.request("sendTransfer", {
      recipients: [{ address: toAddress, amount: satoshis }],
    });
    if ("error" in res) {
      throw new Error(`Unable to sends bitcoin: ${res.error.message}`);
    }
    return { txId: res.result.txid };
  }

  async disconnect(): Promise<void> {
    await this._ctx.api.request("wallet_renouncePermissions", null);
  }

  on(event: BtcWalletEvent, handler: () => void): UnsubscribeFct {
    return this._ctx.api.addListener?.(event, handler) ?? noop;
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

export const xverseWalletDef = {
  key: "xverse" as const,
  info: {
    id: "XverseProviders.BitcoinProvider",
    name: "Xverse",
    webUrl: "https://www.xverse.app/",
    googlePlayStoreUrl: "https://play.google.com/store/apps/details?id=com.secretkeylabs.xverse",
    iOSAppStoreUrl: "https://apps.apple.com/app/xverse-bitcoin-web3-wallet/id1552272513",
    chromeWebStoreUrl:
      "https://chromewebstore.google.com/detail/xverse-wallet/idnnbdplmphpflfnlkomgpfbpcgelopg",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJJY29uX0FydCAoRWRpdCBNZSkiPgo8cmVjdCB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgZmlsbD0iIzE4MTgxOCIvPgo8ZyBpZD0iTG9nby9FbWJsZW0iIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8yMF8xMjIzKSI+CjxwYXRoIGlkPSJWZWN0b3IiIGQ9Ik03NC42NTQyIDczLjg4ODNWNjUuMjMxMkM3NC42NTQyIDY0Ljg4OCA3NC41MTc3IDY0LjU2MDYgNzQuMjc0NSA2NC4zMTc0TDM3LjQzOTcgMjcuNDgyNUMzNy4xOTY1IDI3LjIzOTIgMzYuODY5MSAyNy4xMDI4IDM2LjUyNTggMjcuMTAyOEgyNy44NjlDMjcuNDQxNiAyNy4xMDI4IDI3LjA5MzggMjcuNDUwNiAyNy4wOTM4IDI3Ljg3OFYzNS45MjExQzI3LjA5MzggMzYuMjY0NCAyNy4yMzAyIDM2LjU5MTcgMjcuNDczNCAzNi44MzVMNDAuNjk1MiA1MC4wNTY3QzQwLjk5NzUgNTAuMzU5MSA0MC45OTc1IDUwLjg1MDEgNDAuNjk1MiA1MS4xNTI0TDI3LjMyMTEgNjQuNTI2NUMyNy4xNzU2IDY0LjY3MiAyNy4wOTM4IDY0Ljg2OTggMjcuMDkzOCA2NS4wNzQ0VjczLjg4ODNDMjcuMDkzOCA3NC4zMTUzIDI3LjQ0MTYgNzQuNjYzNSAyNy44NjkgNzQuNjYzNUg0Mi4zMzQyQzQyLjc2MTYgNzQuNjYzNSA0My4xMDk0IDc0LjMxNTMgNDMuMTA5NCA3My44ODgzVjY4LjY5NThDNDMuMTA5NCA2OC40OTEyIDQzLjE5MTIgNjguMjkzNSA0My4zMzY4IDY4LjE0NzlMNTAuNTExNCA2MC45NzMzQzUwLjgxMzggNjAuNjcwOSA1MS4zMDQ4IDYwLjY3MDkgNTEuNjA3MiA2MC45NzMzTDY0LjkxOTggNzQuMjg2MUM2NS4xNjMxIDc0LjUyOTMgNjUuNDkwNCA3NC42NjU4IDY1LjgzMzcgNzQuNjY1OEg3My44NzY3Qzc0LjMwNDIgNzQuNjY1OCA3NC42NTE5IDc0LjMxNzYgNzQuNjUxOSA3My44OTA2TDc0LjY1NDIgNzMuODg4M1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGlkPSJWZWN0b3JfMiIgZD0iTTU1LjM1OCAzOC41NjcySDYyLjYwMzFDNjMuMDMyOCAzOC41NjcyIDYzLjM4MjkgMzguOTE3MyA2My4zODI5IDM5LjM0NjlWNDYuNTkyMUM2My4zODI5IDQ3LjI4NzcgNjQuMjI0IDQ3LjYzNTUgNjQuNzE1MSA0Ny4xNDIyTDc0LjY1NDEgMzcuMTg3M0M3NC43OTk0IDM3LjA0MTggNzQuODgxNiAzNi44NDQgNzQuODgxNiAzNi42MzcxVjI3LjkxODlDNzQuODgxNiAyNy40ODkyIDc0LjUzMzQgMjcuMTM5MSA3NC4xMDE3IDI3LjEzOTFMNjUuMjUzOCAyNy4xMjc3QzY1LjA0NyAyNy4xMjc3IDY0Ljg0OTIgMjcuMjA5NiA2NC43MDE0IDI3LjM1NTFMNTQuODA1NiAzNy4yMzVDNTQuMzE0NSAzNy43MjYgNTQuNjYyMyAzOC41NjcyIDU1LjM1NTcgMzguNTY3Mkg1NS4zNThaIiBmaWxsPSIjRUU3QTMwIi8+CjwvZz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF8yMF8xMjIzIj4KPHJlY3Qgd2lkdGg9IjQ3LjgxMjUiIGhlaWdodD0iNDcuODEyNSIgZmlsbD0id2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI3LjA5MzggMjcuMDkzOCkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K",
  },
  async connect() {
    const api = get(window, this.info.id);
    if (!isXverseApi(api)) {
      throw new Error("Xverse extension is not installed");
    }
    const handler = new XverseBtcWalletHandler({ api });
    await handler.checkPermissions();
    return handler as BtcWalletHandler;
  },
} satisfies BtcWalletDef;
