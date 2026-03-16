import {
  type DefaultWalletApi,
  getWalletExtensions as defaultGetWalletExtensions,
  getWalletInfo as defaultGetWalletInfo,
  supportedWalletsMap,
  type WalletInfo,
} from "@/lib/main";

export type InstalledExtension = {
  info: WalletInfo;
  defaultApi: DefaultWalletApi;
};

export type InstalledExtensions = {
  supportedMap: Map<string, InstalledExtension>;
  unsupportedMap: Map<string, InstalledExtension>;
  allMap: Map<string, InstalledExtension>;
  supportedArr: InstalledExtension[];
  unsupportedArr: InstalledExtension[];
  allArr: InstalledExtension[];
};

export function newInstalledExtensions(): InstalledExtensions {
  return {
    supportedMap: new Map<string, InstalledExtension>(),
    unsupportedMap: new Map<string, InstalledExtension>(),
    allMap: new Map<string, InstalledExtension>(),
    supportedArr: [],
    unsupportedArr: [],
    allArr: [],
  };
}

export type ExtensionCache = Map<DefaultWalletApi, InstalledExtension>;

export function newExtensionCache(): ExtensionCache {
  return new Map();
}

export async function getInstalledExtensions({
  cache,
  getWalletInfo = defaultGetWalletInfo,
  getWalletExtensions = defaultGetWalletExtensions,
  registeredWallets = supportedWalletsMap,
}: {
  cache?: ExtensionCache;
  getWalletInfo?: typeof defaultGetWalletInfo;
  getWalletExtensions?: typeof defaultGetWalletExtensions;
  registeredWallets?: Map<string, WalletInfo>;
} = {}): Promise<InstalledExtensions> {
  const walletExtensions = await getWalletExtensions();
  const res = newInstalledExtensions();

  for (const extension of walletExtensions) {
    const info = getWalletInfo(extension, registeredWallets);

    let api: InstalledExtension;
    api = cache?.get(extension.defaultApi) ?? { info, defaultApi: extension.defaultApi };

    cache?.set(extension.defaultApi, api);

    res.allMap.set(info.key, api);
    res.allArr.push(api);
    if (info.supported) {
      res.supportedMap.set(info.key, api);
      res.supportedArr.push(api);
    } else {
      res.unsupportedMap.set(info.key, api);
      res.unsupportedArr.push(api);
    }
  }

  return res;
}
