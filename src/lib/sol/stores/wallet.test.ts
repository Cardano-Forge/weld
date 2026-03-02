import { LifeCycleManager } from "@/internal/lifecycle";
import { WalletConnectionAbortedError } from "@/lib/main";
import { createConfigStore } from "@/lib/main/stores/config";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SolConfig, SolExtensionInfo } from "../types";
import { createSolExtensionsStore } from "./extensions";
import { createSolWalletStore } from "./wallet";

const mockGetBalance = vi.fn();
const mockGetParsedTokenAccountsByOwner = vi.fn();
const mockGetLatestBlockhash = vi.fn();
const mockGetAccountInfo = vi.fn();

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  class MockConnection {
    getBalance = mockGetBalance;
    getParsedTokenAccountsByOwner = mockGetParsedTokenAccountsByOwner;
    getLatestBlockhash = mockGetLatestBlockhash;
    getAccountInfo = mockGetAccountInfo;
  }
  return {
    ...actual,
    Connection: MockConnection,
  };
});

const mockGetAssociatedTokenAddress = vi.fn();
vi.mock("@solana/spl-token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/spl-token")>();
  return {
    ...actual,
    getAssociatedTokenAddress: (...args: unknown[]) => mockGetAssociatedTokenAddress(...args),
  };
});

const lifecycle = new LifeCycleManager();

const walletKey = "phantom";
const supportedExtension: SolExtensionInfo = {
  key: walletKey,
  displayName: "Phantom",
  path: "phantom.solana",
};

const secondWalletAddress = "DmrsbqsvqhN2nrDsvcC5doXENCvggsxTxw5GvYvvpd7t";
const weldTestTokenAddress = "HhRSKz8cQruqoC4MfPjwrd57DVudshPhx8RXa5NVVf67";
const mockBalanceLamports = 5_000_000_000; // 5 SOL in lamports
const tokenBalanceLamports = 1000000000000000000n;
const tokenBalanceSol = tokenBalanceLamports / BigInt(LAMPORTS_PER_SOL);
const tokenDecimals = 9;
const signature = "a_signature";
const mockBlockhash = "mock_blockhash_value";

const publicKeyBytes = Uint8Array.from([
  27, 245, 253, 95, 185, 95, 232, 136, 100, 224, 148, 51, 194, 98, 149, 47, 221, 73, 24, 156,
  127, 46, 65, 230, 189, 44, 146, 206, 218, 188, 212, 169,
]);

const signAndSendTransactionSpy = vi.fn();

const mockTokenAccount = {
  value: [
    {
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: {
                amount: tokenBalanceLamports.toString(),
                uiAmount: Number(tokenBalanceLamports),
                decimals: tokenDecimals,
              },
              mint: weldTestTokenAddress,
            },
          },
        },
      },
      pubkey: new PublicKey(publicKeyBytes),
    },
  ],
};

beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).phantom = {
    solana: {
      publicKey: { toBytes: () => publicKeyBytes },
      connect: async () => {},
      signAndSendTransaction: async (...params: unknown[]) => {
        signAndSendTransactionSpy(...params);
        return { signature };
      },
    },
  };
  signAndSendTransactionSpy.mockReset();

  mockGetBalance.mockResolvedValue(mockBalanceLamports);
  mockGetParsedTokenAccountsByOwner.mockResolvedValue(mockTokenAccount);
  mockGetLatestBlockhash.mockResolvedValue({ blockhash: mockBlockhash });
  mockGetAccountInfo.mockResolvedValue(null);
  mockGetAssociatedTokenAddress.mockResolvedValue(new PublicKey(publicKeyBytes));
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
  const extensions = createSolExtensionsStore({
    supportedExtensionInfos: [supportedExtension],
    lifecycle,
  });
  const config = createConfigStore<SolConfig>();
  config.update({ connectionEndpoint: "https://mock-endpoint.test" });
  const wallet = createSolWalletStore({
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
    expect(connected.balanceLamports).toBe(BigInt(mockBalanceLamports));
    expect(connected.balanceSol).toBe(BigInt(mockBalanceLamports) / BigInt(LAMPORTS_PER_SOL));
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

describe("getTokenBalance", () => {
  it("should return the token balance in lamports as a bigint", async () => {
    const { wallet } = newTestStores();
    await wallet.connectAsync(walletKey);
    const state = wallet;
    expect(state.isConnected).toBe(true);
    const balance = await state.getTokenBalance(weldTestTokenAddress);
    expect(typeof balance).toBe("bigint");
    expect(balance).toBe(tokenBalanceLamports);
  });

  it("should return the token balance in sol as a bigint", async () => {
    const { wallet } = newTestStores();
    await wallet.connectAsync(walletKey);
    const state = wallet;
    expect(state.isConnected).toBe(true);
    const balance = await state.getTokenBalance(weldTestTokenAddress, { unit: "sol" });
    expect(typeof balance).toBe("bigint");
    expect(balance).toBe(tokenBalanceSol);
  });
});

describe("send", () => {
  it("should fail when wallet isn't connected", async () => {
    const { wallet } = newTestStores();
    await expect(() => wallet.send({ to: "to", amount: "1" })).rejects.toThrow();
  });

  it("should send currency with the appropriate units", async () => {
    const { wallet } = newTestStores();
    await wallet.connectAsync(walletKey);
    const res = await wallet.send({
      to: secondWalletAddress,
      amount: "2",
      unit: "sol",
    });
    expect(signAndSendTransactionSpy).toHaveBeenCalledOnce();
    expect(signAndSendTransactionSpy).toHaveBeenLastCalledWith(res.transaction);
    expect(res.signature).toBe(signature);
    const res2 = await wallet.send({
      to: secondWalletAddress,
      amount: "2",
      unit: "lamport",
    });
    expect(signAndSendTransactionSpy).toHaveBeenCalledTimes(2);
    expect(signAndSendTransactionSpy).toHaveBeenLastCalledWith(res2.transaction);
    expect(res2.signature).toBe(signature);
  });

  it("should send tokens", async () => {
    const { wallet } = newTestStores();
    await wallet.connectAsync(walletKey);
    const res = await wallet.send({
      to: secondWalletAddress,
      amount: "2",
      unit: weldTestTokenAddress,
    });
    expect(res.signature).toBe(signature);
    expect(res.transaction.instructions.length).toBe(2);
  });
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
