import { LifeCycleManager } from "@/internal/lifecycle";
import { WalletConnectionAbortedError } from "@/lib/main";
import { createConfigStore } from "@/lib/main/stores/config";
import { LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SolConfig, SolExtensionInfo } from "../types";
import { createSolExtensionsStore } from "./extensions";
import { createSolWalletStore } from "./wallet";

const lifecycle = new LifeCycleManager();

const walletKey = "phantom";
const supportedExtension: SolExtensionInfo = {
  key: walletKey,
  displayName: "Phantom",
  path: "phantom.solana",
};

const weldTestTokenAddress = "HhRSKz8cQruqoC4MfPjwrd57DVudshPhx8RXa5NVVf67";
const tokenBalanceLamports = 1000000000000000000n;
const tokenBalanceSol = tokenBalanceLamports / BigInt(LAMPORTS_PER_SOL);

const publicKeyBytes = Uint8Array.from([
  27, 245, 253, 95, 185, 95, 232, 136, 100, 224, 148, 51, 194, 98, 149, 47, 221, 73, 24, 156, 127,
  46, 65, 230, 189, 44, 146, 206, 218, 188, 212, 169,
]);

beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).phantom = {
    solana: {
      publicKey: { toBytes: () => publicKeyBytes },
      connect: async () => {},
    },
  };
  vi.resetAllMocks();
});

afterEach(() => {
  lifecycle.cleanup();
});

function newTestStores() {
  const extensions = createSolExtensionsStore({
    supportedExtensionInfos: [supportedExtension],
    lifecycle,
  });
  const config = createConfigStore<SolConfig>();
  config.getState().update({ connectionEndpoint: clusterApiUrl("devnet") });
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
    const connected = await wallet.getState().connectAsync(walletKey);
    expect(connected.balanceSol).toBeGreaterThan(0);
  });

  it("should fail connection when is aborted", async () => {
    const { wallet } = newTestStores();
    const signal = lifecycle.inFlight.add();
    signal.aborted = true;
    await expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
      return (wallet.getState().connectAsync as any)(walletKey, undefined, signal);
    }).rejects.toThrow(WalletConnectionAbortedError);
  });

  it("should disconnect the wallet", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "disconnect");
    await wallet.getState().connectAsync(walletKey);
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.disconnect).toHaveBeenCalled();
  });
});

describe("getTokenBalance", () => {
  it("should return the token balance in lamports as a bigint", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    const state = wallet.getState();
    expect(state.isConnected).toBe(true);
    const balance = await state.getTokenBalance(weldTestTokenAddress);
    expect(typeof balance).toBe("bigint");
    expect(balance).toBe(tokenBalanceLamports);
  });

  it("should return the token balance in sol as a bigint", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    const state = wallet.getState();
    expect(state.isConnected).toBe(true);
    const balance = await state.getTokenBalance(weldTestTokenAddress, { unit: "sol" });
    expect(typeof balance).toBe("bigint");
    expect(balance).toBe(tokenBalanceSol);
  });
});

describe("send", () => {
  it("should fail when wallet isn't connected", async () => {
    const { wallet } = newTestStores();
    await expect(() => wallet.getState().send({ to: "to", amount: "1" })).rejects.toThrow();
  });

  it("should send currency with the appropriate units", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    console.log("balance sol", wallet.getState().balanceSol);
    // const res = await wallet.getState().send({ to: "recipient", amount: "2", unit: "sol" });
  });
});

describe("disconnect", () => {
  it("should disconnect the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "disconnect");
    wallet.getState().disconnect();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.disconnect).toHaveBeenCalled();
  });
});

describe("init", () => {
  it("should init the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "init");
    wallet.init();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.init).toHaveBeenCalled();
  });
});

describe("persist", () => {
  it("should persist the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "persist");
    wallet.persist();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.persist).toHaveBeenCalled();
  });
});

describe("cleanup", () => {
  it("should cleanup the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "cleanup");
    wallet.cleanup();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.cleanup).toHaveBeenCalled();
  });
});
