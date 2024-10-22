import { WalletConnectionAbortedError, WalletConnectionError } from "@/lib/main";
import { createConfigStore } from "@/lib/main/stores/config";
import { BrowserProvider, formatEther } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifeCycleManager } from "../lifecycle";
import { createEvmExtensionsStore } from "./extensions";
import { type EvmExtensionInfo, evmChainIds } from "./types";
import { createEvmWalletStore } from "./wallet";

const chain: keyof typeof evmChainIds = "eth";
const chainId = evmChainIds[chain];
const walletKey = "metamask";
const balanceWei = 232111122321n;
const balanceEth = formatEther(balanceWei);
const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

const lifecycle = new LifeCycleManager();

const supportedExtension: EvmExtensionInfo = {
  key: walletKey,
  displayName: "Metamask",
  path: "ethereum",
};

// biome-ignore lint/suspicious/noExplicitAny: For testing purposes
let api: { request: (...params: any[]) => unknown } | undefined = undefined;
const evmRequestSpy = vi.fn();

function newEthereumApi() {
  return {
    request: (req: { method: string; params: unknown[] }) => {
      evmRequestSpy(req.method, ...req.params);
      switch (req.method) {
        case "eth_chainId":
          return chainId;
        case "eth_requestAccounts":
        case "eth_accounts":
          return [address];
        case "eth_getBalance":
          return balanceWei;
        default:
          return null;
      }
    },
  };
}

beforeEach(() => {
  api = newEthereumApi();
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).ethereum = api;
  evmRequestSpy.mockReset();
});

afterEach(() => {
  lifecycle.cleanup();
});

function newTestStores() {
  const extensions = createEvmExtensionsStore([supportedExtension], { lifecycle });
  const config = createConfigStore();
  const wallet = createEvmWalletStore(
    {
      chain,
      extensions,
      config,
      storageKey: "connectedEthWallet",
    },
    { lifecycle },
  );
  return { extensions, config, wallet };
}

describe("createEvmWalletStore.connectAsync", () => {
  it("should connect to valid installed wallets successfully", async () => {
    const { wallet } = newTestStores();
    const connected = await wallet.getState().connectAsync(walletKey);
    expect(connected.key).toBe(supportedExtension.key);
    expect(connected.displayName).toBe(supportedExtension.displayName);
    expect(connected.path).toBe(supportedExtension.path);
    expect(connected.api).toBe(api);
    expect(connected.balanceWei).toBe(balanceWei);
    expect(connected.balanceEth).toBe(balanceEth);
    expect(connected.address).toBe(address);
    expect(connected.provider).toBeInstanceOf(BrowserProvider);
    expect(connected.signer.getAddress()).resolves.toBe(address);
    expect(connected.isConnected).toBe(true);
    expect(connected.isConnecting).toBe(false);
    expect(connected.isConnectingTo).toBeUndefined();
  });

  it("should request user identification", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    expect(evmRequestSpy).toHaveBeenCalledWith("eth_requestAccounts");
  });

  it("should switch network to provided chain id", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    expect(evmRequestSpy).toHaveBeenCalledWith("wallet_switchEthereumChain", { chainId });
  });

  it("should fail if the extension is not installed", async () => {
    const { wallet } = newTestStores();
    await expect(() => wallet.getState().connectAsync("phantom")).rejects.toThrow(
      WalletConnectionError,
    );
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

describe("createEvmWalletStore.connect", () => {
  it("should connect to valid installed wallets successfully", () =>
    new Promise<void>((done) => {
      const { wallet } = newTestStores();
      wallet.getState().connect(walletKey, {
        onSuccess(connected) {
          expect(connected.key).toBe(supportedExtension.key);
          expect(connected.displayName).toBe(supportedExtension.displayName);
          expect(connected.path).toBe(supportedExtension.path);
          expect(connected.api).toBe(api);
          expect(connected.balanceWei).toBe(balanceWei);
          expect(connected.balanceEth).toBe(balanceEth);
          expect(connected.address).toBe(address);
          expect(connected.provider).toBeInstanceOf(BrowserProvider);
          expect(connected.signer.getAddress()).resolves.toBe(address);
          expect(connected.isConnected).toBe(true);
          expect(connected.isConnecting).toBe(false);
          expect(connected.isConnectingTo).toBeUndefined();
          done();
        },
      });
    }));

  it("should request user identification", async () => {
    return new Promise<void>((done) => {
      const { wallet } = newTestStores();
      wallet.getState().connect(walletKey, {
        onSuccess() {
          expect(evmRequestSpy).toHaveBeenCalledWith("eth_requestAccounts");
          done();
        },
      });
    });
  });

  it("should switch network to provided chain id", async () => {
    return new Promise<void>((done) => {
      const { wallet } = newTestStores();
      wallet.getState().connect(walletKey, {
        onSuccess() {
          expect(evmRequestSpy).toHaveBeenCalledWith("wallet_switchEthereumChain", { chainId });
          done();
        },
      });
    });
  });

  it("should fail if the extension is not installed", async () => {
    return new Promise<void>((done) => {
      const { wallet } = newTestStores();
      wallet.getState().connect("phantom", {
        onError(error) {
          expect(error).toBeInstanceOf(WalletConnectionError);
        },
      });
      done();
    });
  });

  it("should fail connection is aborted", async () => {
    return new Promise<void>((done) => {
      const { wallet } = newTestStores();
      const signal = lifecycle.inFlight.add();
      signal.aborted = true;
      // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
      (wallet.getState().connect as any)(
        walletKey,
        {
          onError(error: unknown) {
            expect(error).toBeInstanceOf(WalletConnectionAbortedError);
          },
        },
        signal,
      );
      done();
    });
  });

  it("should disconnect the wallet", async () => {
    return new Promise<void>((done) => {
      const { wallet } = newTestStores();
      // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
      vi.spyOn((wallet.getState() as any).__mngr, "disconnect");
      wallet.getState().connect(walletKey, {
        onSuccess() {
          // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
          expect((wallet.getState() as any).__mngr.disconnect).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
