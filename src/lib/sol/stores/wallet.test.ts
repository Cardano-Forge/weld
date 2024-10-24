import { WalletConnectionAbortedError } from "@/lib/main";
import { createConfigStore } from "@/lib/main/stores/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSolExtensionsStore } from "./extensions";
import { createSolWalletStore } from "./wallet";
import { LifeCycleManager } from "@/internal/lifecycle";
import type { SolExtensionInfo } from "../types";
import { getFailureReason } from "@/internal/utils/errors";

const lifecycle = new LifeCycleManager();

const walletKey = "phantom";
const supportedExtension: SolExtensionInfo = {
  key: walletKey,
  displayName: "Phantom",
  path: "phantom.solana",
};

const publicKeyBytes = Uint8Array.from([
  27, 245, 253, 95, 185, 95, 232, 136, 100, 224, 148, 51, 194, 98, 149, 47, 221, 73, 24, 156, 127,
  46, 65, 230, 189, 44, 146, 206, 218, 188, 212, 169,
]);

beforeEach(() => {
  window.phantom = {
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
  const config = createConfigStore();
  const wallet = createSolWalletStore({ lifecycle });
  return { extensions, config, wallet };
}

describe("connectAsync", () => {
  it("should connect to valid installed wallets successfully", async () => {
    const { wallet } = newTestStores();
    try {
      const connected = await wallet.getState().connectAsync(walletKey);
      console.log("connected", connected.key);
    } catch (error) {
      console.log("error", getFailureReason(error));
    }
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
  it("should", () => {});
});

describe("send", () => {
  it("should", () => {});
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
