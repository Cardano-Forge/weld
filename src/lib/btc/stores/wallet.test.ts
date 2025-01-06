import { LifeCycleManager } from "@/internal/lifecycle";
import { WalletConnectionAbortedError } from "@/lib/main";
import { type WeldConfig, createConfigStore } from "@/lib/main/stores/config";
import { defaultAdapters } from "@sats-connect/core";
import { afterEach, beforeAll, beforeEach, describe, expect, it, test, vi } from "vitest";
import type {
  BtcApi,
  BtcWalletDef,
  BtcWalletHandler,
  GetBalanceResult,
  GetInscriptionsResult,
  SendBitcoinResult,
  SendInscriptionResult,
  SignMessageResult,
  SignPsbtResult,
} from "../types";
import { satToBtc } from "../utils";
import { createBtcExtensionsStore } from "./extensions";
import { createBtcWalletStore } from "./wallet";

const lifecycle = new LifeCycleManager();

const paymentAddress = "tb1qtpz4dkmjyum40yru3mwyw4cvafpwyg7pqs7p96";
const publicKey = "032199b7eee664cfde687013abd22d9cbe84794907a607318fde709d6c3693d0be";
const balanceSat = 123_456_789;

const spy = vi.fn();

const inscription = {
  inscriptionId: "6037b17df2f48cf87f6b6e6ff89af416f6f21dd3d3bc9f1832fb1ff560037531i0",
  inscriptionNumber: 959941,
  address: "bc1q8h8s4zd9y0lkrx334aqnj4ykqs220ss735a3gh",
  outputValue: 546,
  preview:
    "https://ordinals.com/preview/6037b17df2f48cf87f6b6e6ff89af416f6f21dd3d3bc9f1832fb1ff560037531i0",
  content:
    "https://ordinals.com/content/6037b17df2f48cf87f6b6e6ff89af416f6f21dd3d3bc9f1832fb1ff560037531i0",
  contentLength: 53,
  contentType: "text/plain;charset=utf-8",
  timestamp: 1680865285,
  genesisTransaction: "6037b17df2f48cf87f6b6e6ff89af416f6f21dd3d3bc9f1832fb1ff560037531",
  location: "6037b17df2f48cf87f6b6e6ff89af416f6f21dd3d3bc9f1832fb1ff560037531:0:0",
  output: "6037b17df2f48cf87f6b6e6ff89af416f6f21dd3d3bc9f1832fb1ff560037531:0",
  offset: 0,
};

const sendBitcoinTxId = "send_bitcoin_tx_id";
const sendInscriptionTxId = "send_inscription_tx_id";
const signedPsbtHex = "the_signed_psbt_hex";
const signature = "a_signature";

class BtcWalletHandlerMock implements BtcWalletHandler {
  async getBalance(): Promise<GetBalanceResult> {
    return { total: balanceSat, confirmed: balanceSat, unconfirmed: 0 };
  }
  async getPaymentAddress(): Promise<string> {
    return paymentAddress;
  }
  async getPublicKey(): Promise<string> {
    return publicKey;
  }
  async getInscriptions(): Promise<GetInscriptionsResult> {
    return { total: 1, results: [inscription] };
  }
  async sendBitcoin(): Promise<SendBitcoinResult> {
    return { txId: sendBitcoinTxId };
  }
  async sendInscription(): Promise<SendInscriptionResult> {
    return { txId: sendInscriptionTxId };
  }
  async signPsbt(): Promise<SignPsbtResult> {
    return { signedPsbtHex };
  }
  async signMessage(): Promise<SignMessageResult> {
    return { signature };
  }
}

const walletKey = "testWalletKey";
const walletId = "testWalletId";
const supportedExtension: BtcWalletDef = {
  key: walletKey,
  info: {
    id: walletId,
    name: "Test Wallet",
    icon: "noicon",
  },
  Adapter: defaultAdapters.unisat,
  async connect() {
    return new BtcWalletHandlerMock();
  },
};

const api: BtcApi = {};

beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any)[walletId] = api;
  spy.mockReset();
  vi.resetAllMocks();
});

afterEach(() => {
  lifecycle.cleanup();
});

beforeAll(() => {
  const originalHasInstance = Uint8Array[Symbol.hasInstance];
  Object.defineProperty(Uint8Array, Symbol.hasInstance, {
    value(potentialInstance: unknown) {
      return (
        originalHasInstance.call(this, potentialInstance) || Buffer.isBuffer(potentialInstance)
      );
    },
  });
});

function newTestStores() {
  const extensions = createBtcExtensionsStore({
    supportedExtensions: [supportedExtension],
    lifecycle,
  });
  const config = createConfigStore<WeldConfig>();
  const wallet = createBtcWalletStore({
    extensions,
    lifecycle,
    config,
  });
  return { extensions, config, wallet };
}

describe("connectAsync", () => {
  it("should connect to valid installed wallets successfully", async () => {
    const { wallet } = newTestStores();
    const connected = await wallet.connectAsync(walletKey);
    expect(connected.balanceBtc).toBe(satToBtc(balanceSat));
    expect(connected.balanceSat).toBe(balanceSat);
    expect(connected.paymentAddress).toBe(paymentAddress);
    expect(connected.publicKey).toBe(publicKey);
    expect(connected.api).toBe(api);
    expect(connected.handler).toBeInstanceOf(BtcWalletHandlerMock);
    expect(connected.adapter).toBeInstanceOf(supportedExtension.Adapter);
    for (const [key, value] of Object.entries(supportedExtension.info)) {
      expect(connected[key as keyof typeof connected]).toBe(value);
    }
  });

  it("should fail connection when is aborted", async () => {
    const { wallet } = newTestStores();
    const signal = lifecycle.inFlight.add();
    signal.aborted = true;
    await expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
      return (wallet.connectAsync as any)(walletKey, undefined, signal);
    }).rejects.toThrow(WalletConnectionAbortedError);
  });

  it("should disconnect the wallet", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet as any).__mngr, "disconnect");
    await wallet.connectAsync(walletKey);
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet as any).__mngr.disconnect).toHaveBeenCalled();
  });
});

test("signMessage", async () => {
  const { wallet } = newTestStores();
  const connected = await wallet.connectAsync(walletKey);
  const res = await connected.signMessage("");
  expect(res.signature).toBe(signature);
});

test("signPsbt", async () => {
  const { wallet } = newTestStores();
  const connected = await wallet.connectAsync(walletKey);
  const res = await connected.signPsbt("", { inputsToSign: {} });
  expect(res.signedPsbtHex).toBe(signedPsbtHex);
});

test("sendBitcoin", async () => {
  const { wallet } = newTestStores();
  const connected = await wallet.connectAsync(walletKey);
  const res = await connected.sendBitcoin("", 1);
  expect(res.txId).toBe(sendBitcoinTxId);
});

test("sendInscription", async () => {
  const { wallet } = newTestStores();
  const connected = await wallet.connectAsync(walletKey);
  const res = await connected.sendInscription("", "");
  expect(res.txId).toBe(sendInscriptionTxId);
});

test("getInscriptions", async () => {
  const { wallet } = newTestStores();
  const connected = await wallet.connectAsync(walletKey);
  const res = await connected.getInscriptions();
  expect(res.total).toBe(1);
  expect(res.results.at(0)).toBe(inscription);
});

describe("disconnect", () => {
  it("should disconnect the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet as any).__mngr, "disconnect");
    wallet.disconnect();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet as any).__mngr.disconnect).toHaveBeenCalled();
  });
});

describe("init", () => {
  it("should init the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet as any).__mngr, "init");
    wallet.init();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet as any).__mngr.init).toHaveBeenCalled();
  });
});

describe("persist", () => {
  it("should persist the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet as any).__mngr, "persist");
    wallet.persist();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet as any).__mngr.persist).toHaveBeenCalled();
  });
});

describe("cleanup", () => {
  it("should cleanup the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet as any).__mngr, "cleanup");
    wallet.cleanup();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet as any).__mngr.cleanup).toHaveBeenCalled();
  });
});
