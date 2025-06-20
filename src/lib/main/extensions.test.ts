import { describe, expect, it } from "vitest";
import { getInstalledExtensions, newExtensionCache } from "./extensions";
import type { WalletExtension, WalletInfo, getWalletExtensions, getWalletInfo } from "./utils";

function newWalletExtensions(): WalletExtension[] {
  return [
    {
      key: "lace",
      defaultApi: {
        name: "lace",
        icon: "lace",
        apiVersion: "0.1.0",
        enable() {
          throw new Error("Not implemented");
        },
        isEnabled() {
          return Promise.resolve(false);
        },
      },
    },
    {
      key: "eternl",
      defaultApi: {
        name: "eternl",
        icon: "eternl",
        apiVersion: "0.1.0",
        enable() {
          throw new Error("Not implemented");
        },
        isEnabled() {
          return Promise.resolve(false);
        },
      },
    },
  ];
}

const walletExtensions = newWalletExtensions();

function newGetWalletExtensionsMock({ caching = false } = {}): typeof getWalletExtensions {
  return async () => {
    if (caching) {
      return walletExtensions;
    }
    return newWalletExtensions();
  };
}

function newGetWalletInfoMock(supportedKeys: string[] = []): typeof getWalletInfo {
  return (extension) => {
    return {
      supported: supportedKeys.includes(extension.key),
      key: extension.key,
      icon: extension.defaultApi.icon,
      displayName: extension.defaultApi.name,
      website: undefined,
      supportsTxChaining: false,
    } as WalletInfo;
  };
}

describe("getInstalledExtensions", () => {
  it("should return extensions", async () => {
    const res = await getInstalledExtensions({
      getWalletInfo: newGetWalletInfoMock(),
      getWalletExtensions: newGetWalletExtensionsMock(),
    });
    expect(res.allArr.length).toBe(walletExtensions.length);
    expect(res.allMap.size).toBe(walletExtensions.length);
    expect(res.unsupportedArr.length).toBe(walletExtensions.length);
    expect(res.unsupportedMap.size).toBe(walletExtensions.length);
    expect(res.supportedArr.length).toBe(0);
    expect(res.supportedMap.size).toBe(0);
  });

  it("should classify extensions", async () => {
    const res = await getInstalledExtensions({
      getWalletInfo: newGetWalletInfoMock(["lace"]),
      getWalletExtensions: newGetWalletExtensionsMock(),
    });
    expect(res.allArr.length).toBe(walletExtensions.length);
    expect(res.allMap.size).toBe(walletExtensions.length);
    expect(res.unsupportedArr.length).toBe(1);
    expect(res.unsupportedMap.size).toBe(1);
    expect(res.supportedArr.length).toBe(1);
    expect(res.supportedMap.size).toBe(1);
    expect(res.unsupportedMap.get("eternl")?.info.key).toBe("eternl");
    expect(res.unsupportedArr.find((e) => e.info.key === "eternl")).not.toBeUndefined();
    expect(res.supportedMap.get("lace")?.info.key).toBe("lace");
    expect(res.supportedArr.find((e) => e.info.key === "lace")).not.toBeUndefined();
  });

  it("should retrieve the same objects when caching is enabled", async () => {
    const cache = newExtensionCache();
    const res1 = await getInstalledExtensions({
      cache,
      getWalletExtensions: newGetWalletExtensionsMock({ caching: true }),
      getWalletInfo: newGetWalletInfoMock(),
    });
    const res2 = await getInstalledExtensions({
      cache,
      getWalletExtensions: newGetWalletExtensionsMock({ caching: true }),
      getWalletInfo: newGetWalletInfoMock(),
    });
    const lace1 = res1.allMap.get("lace");
    const lace2 = res2.allMap.get("lace");
    expect(lace1).toBe(lace2);
  });

  it("should retrieve new objects when caching is disabled", async () => {
    const res1 = await getInstalledExtensions({
      getWalletExtensions: newGetWalletExtensionsMock({ caching: true }),
      getWalletInfo: newGetWalletInfoMock(),
    });
    const res2 = await getInstalledExtensions({
      getWalletExtensions: newGetWalletExtensionsMock({ caching: true }),
      getWalletInfo: newGetWalletInfoMock(),
    });
    const lace1 = res1.allMap.get("lace");
    const lace2 = res2.allMap.get("lace");
    expect(lace1).toStrictEqual(lace2);
    expect(lace1).not.toBe(lace2);
  });

  it("should return new instances when the api changes", async () => {
    const cache = newExtensionCache();
    const res1 = await getInstalledExtensions({
      cache,
      getWalletExtensions: newGetWalletExtensionsMock({ caching: false }),
      getWalletInfo: newGetWalletInfoMock(),
    });
    const res2 = await getInstalledExtensions({
      cache,
      getWalletExtensions: newGetWalletExtensionsMock({ caching: false }),
      getWalletInfo: newGetWalletInfoMock(),
    });
    const lace1 = res1.allMap.get("lace");
    const lace2 = res2.allMap.get("lace");
    expect(lace1?.info).toStrictEqual(lace2?.info);
    expect(lace1?.defaultApi).not.toStrictEqual(lace2?.defaultApi);
    expect(lace1).not.toBe(lace2);
  });
});
