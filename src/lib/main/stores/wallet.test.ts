import { LifeCycleManager } from "@/internal/lifecycle";
import { deferredPromise } from "@/internal/utils/deferred-promise";
import { keys } from "@/internal/utils/keys";
import { UtxosUpdateManager } from "@/internal/utxos-update";
import { WalletConnectionAbortedError } from "@/lib/main/utils/errors";
import type {
  ChangeAddressHex,
  DefaultWalletApi,
  EnabledWalletApi,
  NetworkId,
  StakeAddressHex,
} from "@/lib/main/utils/extensions";
import { hexToBech32 } from "@/lib/main/utils/hex-to-bech32";
import { supportedWalletsMap } from "@/lib/main/utils/wallets";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWalletStore } from "./wallet";

const balance =
  "821a2c632123b1581c13989ac1d5046f150f247726644f2e99c9b489260943c2865e7279aea142343101581c19f4f7ff228bb1f98fc86280597cce31effe277762ab20fa0decea54a64d486f6d657250756e6b73313030014e486f6d657250756e6b7331303330014e486f6d657250756e6b7331303435014e486f6d657250756e6b7331363132014e486f6d657250756e6b7331383432014e486f6d657250756e6b733237383901581c279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3fa144534e454b19d1b2581c2ab03aa40dbf23fcdee0e7eb2572acce93adc56bfc315fe4313c161aa14343544f1905f3581c2b43a53d30347c1983d632e0437e2dec5a5c00ee3007627f1f0b1d30a14e467574757265426f74303330303601581c34b75dfcf4c0a6cfcad47dc4bb5b0d6a754a11aec72cf1503f41f69fa145666f7267651905da581c3d250a78df7ad14e9472d9b63159ef2d099740c593c0ba53059f144aa152456e6c69676874656e6d696e74303937313801581c404456a40a3faa5a23bbd35a933ae7b81730dda2dddc35564713d80ca15352616262697453796e6469636174653238373201581c6081baf9aa67b8959b4c18a44b22549448740c0fe74aa831140dad6ea14e536b656c4361707461696e32303501581c885742cd7e0dad321622b5d3ad186797bd50c44cbde8b48be1583fbda145534b554c4c19015d581c8f80ebfaf62a8c33ae2adf047572604c74db8bc1daba2b43f9a65635a15043617264616e6f57617272696f72353401581cd715d2b6dfc95a26058eb516669d3027bd34d98909e2a7b9f4fce071a2524e656d6f6e69756d536b756c6c303930353301524e656d6f6e69756d536b756c6c313038373401581cd8a96afb1e6edb4e45955ecf82d59b81ed6de694b2623ec4e1811e50a14f486f72726f7250756e6b303632323501581cf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9aa149646f64696c616e6e6501581cf4988f549728dc76b58d7677849443caf6e5385dc67e6c25f6aa901ea14a506978656c54696c653101581cf7f5a12b681be1a2c02054414a726fefadd47e24b0343cd287c0283da558187a69676f7242656e6a616d696e7347726f757030333037340158187a69676f7242656e6a616d696e7347726f757030333339370158187a69676f7242656e6a616d696e7347726f757030333530330158187a69676f7242656e6a616d696e7347726f757030333830380158187a69676f7242656e6a616d696e7347726f7570303338313401581cfc08aff43685ca4d5536a0a6c006c724ab37fcc41eb06940ee8b62dfa14c53776565744b65793332313001";
const balanceLovelace = 744694051;
const balanceAda = 744.694051;

const updatedBalance =
  "821a06823540a5581c19f4f7ff228bb1f98fc86280597cce31effe277762ab20fa0decea54a14e486f6d657250756e6b733130303701581c1af660e4c58514a2f0ea167deca340381e55bed4aea60bc09c211417ad4d416e76696c5465737430343130014d416e76696c5465737431323733014d416e76696c5465737432303531014d416e76696c5465737432333731014d416e76696c5465737432343436014d416e76696c5465737432343933014d416e76696c5465737432353835014d416e76696c5465737432353935014d416e76696c5465737432363130014d416e76696c5465737432363432014d416e76696c5465737432363837014d416e76696c5465737432373838014d416e76696c546573743237393101581c8c6403b2057eb05cfe2cebd623cb70afc38705b51d6ae90395ac80d7a24b4765726f5069786c303131014b4765726f5069786c30313401581ca12177cfaa9993918c864b46e5ba5113b4d5078b9f9d4b1dcfb9761ea34d416e76696c5465737430303936014d416e76696c5465737430303938014d416e76696c546573743031303101581cfc08aff43685ca4d5536a0a6c006c724ab37fcc41eb06940ee8b62dfa14c53776565744b65793539363901";

const networkId: NetworkId = 1;
const changeAddressHex: ChangeAddressHex =
  "0148dc188cd7a3fa245498144a5469c34ea11c54975587529269430016a2b990e0c40026e9e9381abdb18ba9f4bf80bd65f7c19263357f6497";
const changeAddressBech32 = hexToBech32(changeAddressHex);
const stakeAddressHex: StakeAddressHex =
  "e1a2b990e0c40026e9e9381abdb18ba9f4bf80bd65f7c19263357f6497";
const stakeAddressBech32 = hexToBech32(stakeAddressHex);

const enabledApi = {
  getBalance: async () => balance,
  getNetworkId: async () => networkId,
  getChangeAddress: async () => changeAddressHex,
  getRewardAddresses: async () => [stakeAddressHex],
} as EnabledWalletApi;

// biome-ignore lint/style/noNonNullAssertion: For testing purposes
const namiInfo = supportedWalletsMap.get("nami")!;
// biome-ignore lint/style/noNonNullAssertion: For testing purposes
const eternlInfo = supportedWalletsMap.get("eternl")!;

const lifecycle = new LifeCycleManager();

const setupAutoUpdateStopSpy = vi.hoisted(() => vi.fn());
const setupAutoUpdateSpy = vi.hoisted(() => vi.fn());
vi.mock("@/internal/auto-update", () => ({
  setupAutoUpdate: (fct: (stop: () => void) => void, ...params: unknown[]) => {
    setupAutoUpdateSpy(fct, ...params);
    const handler = () => fct(setupAutoUpdateStopSpy);
    window.addEventListener("focus", handler);
    lifecycle.subscriptions.add(() => {
      window.removeEventListener("focus", handler);
    });
    return { stop: setupAutoUpdateStopSpy };
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  lifecycle.cleanup();
});

describe("connectAsync", () => {
  it("should connect to valid installed wallets successfully", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    const connected = await wallet.getState().connectAsync("nami");
    for (const key of keys(namiInfo)) {
      expect(connected[key]).toBe(namiInfo[key]);
    }
    expect(connected.networkId).toBe(networkId);
    expect(connected.balanceLovelace).toBe(balanceLovelace);
    expect(connected.balanceAda).toBe(balanceAda);
    expect(connected.changeAddressHex).toBe(changeAddressHex);
    expect(connected.changeAddressBech32).toBe(changeAddressBech32);
    expect(connected.stakeAddressHex).toBe(stakeAddressHex);
    expect(connected.stakeAddressBech32).toBe(stakeAddressBech32);
  });

  it("should update flags", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const connectPromise = deferredPromise<void>();
    const wallet = createWalletStore({
      lifecycle,
      connect: async () => {
        connectPromise.resolve();
        return handler;
      },
    });
    expect(wallet.getState().isConnected).toBe(false);
    expect(wallet.getState().isConnecting).toBe(false);
    expect(wallet.getState().isConnectingTo).toBeUndefined();
    const promise = wallet.getState().connectAsync("nami");
    await connectPromise.promise;
    expect(wallet.getState().isConnected).toBe(false);
    expect(wallet.getState().isConnecting).toBe(true);
    expect(wallet.getState().isConnectingTo).toBe("nami");
    await promise;
    expect(wallet.getState().isConnected).toBe(true);
    expect(wallet.getState().isConnecting).toBe(false);
    expect(wallet.getState().isConnectingTo).toBeUndefined();
  });

  it("should fail if the connection fails", async () => {
    const wallet = createWalletStore({
      lifecycle,
      connect: async () => {
        throw new Error();
      },
    });
    expect(() => wallet.getState().connectAsync("notinstalled")).rejects.toThrow();
  });

  it("should fail connection when is aborted", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const connectReached = deferredPromise<void>();
    const connectTrigger = deferredPromise<void>();
    const wallet = createWalletStore({
      lifecycle,
      connect: async () => {
        connectReached.resolve();
        await connectTrigger.promise;
        return handler;
      },
    });
    const promise = wallet.getState().connectAsync("nami");
    await connectReached.promise;
    lifecycle.cleanup();
    connectTrigger.resolve();
    expect(async () => {
      await promise;
    }).rejects.toThrow(WalletConnectionAbortedError);
  });

  it("should disconnect the wallet", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "disconnect");
    await wallet.getState().connectAsync("nami");
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.disconnect).toHaveBeenCalled();
  });

  it("should update the utxos when balance changes", async () => {
    vi.useFakeTimers();
    const utxosUpdate = new UtxosUpdateManager();
    vi.spyOn(utxosUpdate, "start");
    const updatedEnabledApi = {
      ...enabledApi,
      getBalance: async () => {
        if (++getBalanceCount > 2) {
          return updatedBalance;
        }
        return balance;
      },
    };
    let getBalanceCount = 0;
    const enable = async () => updatedEnabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, updatedEnabledApi, enable);
    const wallet = createWalletStore({ lifecycle, utxosUpdate, connect: async () => handler });
    await wallet.getState().connectAsync("nami");
    expect(utxosUpdate.start).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersToNextTimerAsync();
    expect(utxosUpdate.start).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersToNextTimerAsync();
    expect(utxosUpdate.start).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("should disconnect on update when handler has been disconnected", async () => {
    vi.useFakeTimers();
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    await wallet.getState().connectAsync("nami");
    expect(wallet.getState().isConnected).toBe(true);
    await handler.disconnect();
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersToNextTimerAsync();
    expect(wallet.getState().isConnected).toBe(false);
    vi.useRealTimers();
  });

  it("should connect over existing connections", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const namiHandler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const eternlHandler = new DefaultWalletHandler(eternlInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({
      lifecycle,
      connect: async (key: string) => {
        return key === "nami" ? namiHandler : eternlHandler;
      },
    });
    const connected = await wallet.getState().connectAsync("nami");
    expect(connected.key).toBe("nami");
    expect(wallet.getState().key).toBe("nami");
    const connected2 = await wallet.getState().connectAsync("eternl");
    expect(connected2.key).toBe("eternl");
    expect(wallet.getState().key).toBe("eternl");
  });

  it("should retry fetching utxos until they change upon balance update", async () => {
    vi.useFakeTimers();
    const utxosUpdateRetryInterval = 5000;
    const maxUtxosUpdateRetryCount = 5;
    const utxosUpdate = new UtxosUpdateManager();
    vi.spyOn(utxosUpdate, "start");
    let getBalanceCount = 0;
    let getUtxosCount = 0;
    const initUtxos = ["a"];
    const nextUtxos = ["b"];
    const updatedEnabledApi: EnabledWalletApi = {
      ...enabledApi,
      async getUtxos() {
        if (++getUtxosCount <= maxUtxosUpdateRetryCount + 1) {
          return initUtxos;
        }
        return nextUtxos;
      },
      async getBalance() {
        if (++getBalanceCount === 1) {
          return balance;
        }
        return updatedBalance;
      },
    };
    const enable = async () => updatedEnabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, updatedEnabledApi, enable);
    const wallet = createWalletStore({
      lifecycle,
      utxosUpdate,
      utxosUpdateRetryInterval,
      maxUtxosUpdateRetryCount,
      connect: async () => handler,
    });
    await wallet.getState().connectAsync("nami");
    await vi.advanceTimersToNextTimerAsync();
    expect(wallet.getState().balanceAda).toBe(balanceAda);
    expect(wallet.getState().utxos).toBe(initUtxos);
    window.dispatchEvent(new Event("focus"));
    for (let i = 0; i < maxUtxosUpdateRetryCount - 1; i++) {
      await vi.advanceTimersByTimeAsync(utxosUpdateRetryInterval);
      expect(wallet.getState().isUpdatingUtxos).toBe(true);
      expect(wallet.getState().utxos).toBe(initUtxos);
    }
    await vi.advanceTimersByTimeAsync(utxosUpdateRetryInterval);
    expect(wallet.getState().isUpdatingUtxos).toBe(false);
    expect(wallet.getState().utxos).toBe(nextUtxos);
    vi.useRealTimers();
  });

  it("should give up after maxUtxosUpdateRetryCount", async () => {
    vi.useFakeTimers();
    const utxosUpdateRetryInterval = 5000;
    const maxUtxosUpdateRetryCount = 5;
    const utxosUpdate = new UtxosUpdateManager();
    vi.spyOn(utxosUpdate, "start");
    let getBalanceCount = 0;
    let getUtxosCount = 0;
    const initUtxos = ["a"];
    const updatedEnabledApi: EnabledWalletApi = {
      ...enabledApi,
      async getUtxos() {
        getUtxosCount++;
        return initUtxos;
      },
      async getBalance() {
        if (++getBalanceCount === 1) {
          return balance;
        }
        return updatedBalance;
      },
    };
    const enable = async () => updatedEnabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, updatedEnabledApi, enable);
    const wallet = createWalletStore({
      lifecycle,
      utxosUpdate,
      utxosUpdateRetryInterval,
      maxUtxosUpdateRetryCount,
      connect: async () => handler,
    });
    await wallet.getState().connectAsync("nami");
    await vi.advanceTimersToNextTimerAsync();
    expect(wallet.getState().balanceAda).toBe(balanceAda);
    expect(wallet.getState().utxos).toBe(initUtxos);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(utxosUpdateRetryInterval * maxUtxosUpdateRetryCount * 2);
    expect(getUtxosCount).toBe(maxUtxosUpdateRetryCount + 2); // First fetch + second fetch + retries
    vi.useRealTimers();
  });
});

describe("connect", () => {
  it("should have the same behavior as connectAsync but execute callbacks instead of returning or throwing", () => {});
});

describe("disconnect", () => {
  it("should disconnect the wallet mngr", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "disconnect");
    await wallet.getState().disconnect();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.disconnect).toHaveBeenCalled();
  });
});

describe("init", () => {
  it("should init the wallet mngr", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "init");
    wallet.init();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.init).toHaveBeenCalled();
  });
});

describe("persist", () => {
  it("should persist the wallet mngr", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "persist");
    wallet.persist();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.persist).toHaveBeenCalled();
  });
});

describe("cleanup", () => {
  it("should cleanup the wallet mngr", async () => {
    const enable = async () => enabledApi;
    const defaultApi = { enable, isEnabled: async () => true } as DefaultWalletApi;
    const { DefaultWalletHandler } = await import("@/internal/handler");
    const handler = new DefaultWalletHandler(namiInfo, defaultApi, enabledApi, enable);
    const wallet = createWalletStore({ lifecycle, connect: async () => handler });
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    vi.spyOn((wallet.getState() as any).__mngr, "cleanup");
    wallet.cleanup();
    // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
    expect((wallet.getState() as any).__mngr.cleanup).toHaveBeenCalled();
  });
});
