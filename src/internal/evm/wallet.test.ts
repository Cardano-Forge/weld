import { WalletConnectionAbortedError, WalletConnectionError } from "@/lib/main";
import { createConfigStore } from "@/lib/main/stores/config";
import { BrowserProvider, type ethers, formatEther } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifeCycleManager } from "../lifecycle";
import { createEvmExtensionsStore } from "./extensions";
import { type EvmExtensionInfo, evmChainIds } from "./types";
import { createEvmWalletStore } from "./wallet";

const decimals = vi.hoisted(() => 2);
const balanceOf = vi.hoisted(() => 188888888);

vi.mock(import("ethers"), async (original) => {
  const mod = await original();
  return {
    ...mod,
    ethers: {
      ...mod.ethers,
      Contract: class {
        decimals() {
          return decimals;
        }
        balanceOf() {
          return balanceOf;
        }
        transfer() {
          return { hash: txHash };
        }
      } as unknown as typeof ethers.Contract,
    },
  };
});

const chain: keyof typeof evmChainIds = "eth";
const chainId = evmChainIds[chain];
const walletKey = "metamask";
const balanceWei = 5000000000000000047n;
const balanceEth = formatEther(balanceWei);
const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const ethTokenAddress = "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0";
const txHash = vi.hoisted(
  () => "0x1cdf7f6a4a6597fd30f9cee820c7360797653e1a42ec470461475260581a57ec",
);

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
        case "wallet_switchEthereumChain":
          return;
        case "eth_blockNumber":
          return 3;
        case "eth_estimateGas":
          return 3;
        case "eth_sendTransaction":
          return { hash: txHash };
        case "eth_getTransactionByHash":
          return {
            _type: "TransactionResponse",
            accessList: null,
            blockNumber: 21024317,
            blockHash: "0x95fc27f4ebc3463014f2f659cc3b81a660c77cf06169c33f144d7b10fb00cdb2",
            blobVersionedHashes: null,
            chainId: null,
            data: "0xc4076876000000000000000000000000388c818ca8b9251b393131c08a736a67ccb19297000000000000000000000000000000000000000000000000000000006718311b",
            from: "0x5638cbdC72bd8554055883D309CFc70357190CF3",
            gasLimit: "82266",
            gasPrice: "4432417831",
            hash: txHash,
            maxFeePerGas: null,
            maxPriorityFeePerGas: null,
            maxFeePerBlobGas: null,
            nonce: 2555,
            signature: {
              _type: "signature",
              networkV: null,
              r: "0xc28b9c0fc2b0d86d715e205ddfd8b1476c4eb6d0a566c0cdca5353beca16cc17",
              s: "0x1aedf791b8ddf8c5926262642ca0e8160823623332614c7ad9440e7d6d32f492",
              v: 28,
            },
            to: "0x167E7644a25377544d83FF60672C89831bf2Ac0a",
            index: 94,
            type: 0,
            value: "50130296676349475",
          };
        case "eth_call": {
          // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
          const opts = req.params[0] as any;
          if (
            opts.from.toLowerCase() === address.toLowerCase() &&
            opts.to.toLowerCase() === ethTokenAddress.toLowerCase()
          ) {
            return "0x313ce567";
          }
          console.log(req.method, ...req.params);
          return;
        }
        default:
          console.log(req.method, ...req.params);
      }
    },
  };
}

beforeEach(() => {
  api = newEthereumApi();
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).ethereum = api;
  evmRequestSpy.mockReset();
  vi.resetAllMocks();
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

describe("connectAsync", () => {
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

describe("connect", () => {
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

describe("getTokenBalance", () => {
  it("should fail when signer is not initialized", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    wallet.setState({ signer: undefined });
    expect(() => wallet.getState().getTokenBalance(ethTokenAddress)).rejects.toThrow("Signer");
  });

  it("should fail when provider is not initialized", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    wallet.setState({ provider: undefined });
    expect(() => wallet.getState().getTokenBalance(ethTokenAddress)).rejects.toThrow("Provider");
  });

  it("should switch network to provided chain id", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    evmRequestSpy.mockReset();
    await wallet.getState().getTokenBalance(ethTokenAddress);
    expect(evmRequestSpy).toHaveBeenCalledWith("wallet_switchEthereumChain", { chainId });
  });

  it("should return the unformatted balance", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    const res = await wallet.getState().getTokenBalance(ethTokenAddress);
    expect(res).toBe(balanceOf.toString());
  });

  it("should return the formatted balance", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    const res = await wallet.getState().getTokenBalance(ethTokenAddress, { formatted: true });
    const expected = (balanceOf / 10 ** decimals).toFixed(2);
    expect(res).toBe(expected);
  });
});

describe("send", () => {
  it("should fail when signer is not initialized", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    wallet.setState({ signer: undefined });
    expect(() => wallet.getState().send({ to: ethTokenAddress, amount: "2" })).rejects.toThrow(
      "Signer",
    );
  });

  it("should fail when provider is not initialized", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    wallet.setState({ provider: undefined });
    expect(() => wallet.getState().send({ to: ethTokenAddress, amount: "2" })).rejects.toThrow(
      "Provider",
    );
  });

  it("should switch network to provided chain id", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    evmRequestSpy.mockReset();
    await wallet.getState().send({ to: ethTokenAddress, amount: "2" });
    expect(evmRequestSpy).toHaveBeenCalledWith("wallet_switchEthereumChain", { chainId });
  });

  it("should send funds", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    const res = await wallet.getState().send({ to: ethTokenAddress, amount: "2" });
    expect(res).toBe(txHash);
  });

  it("should send tokens", async () => {
    const { wallet } = newTestStores();
    await wallet.getState().connectAsync(walletKey);
    const to = "0x167E7644a25377544d83FF60672C89831bf2Ac0a";
    const res = await wallet.getState().send({ to, amount: "2", tokenAddress: ethTokenAddress });
    expect(res).toBe(txHash);
  });
});

describe("disconnect", () => {
  it("should disconnect the wallet mngr", async () => {
    const { wallet } = newTestStores();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "disconnect");
    await wallet.getState().disconnect();
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
