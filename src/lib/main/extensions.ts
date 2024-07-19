import {
  type DefaultWalletApi,
  type WalletInfo,
  type WalletKey,
  getWalletExtensions,
  getWalletInfo,
} from "@/lib/utils";

export type InstalledExtension = {
  info: WalletInfo;
  defaultApi: DefaultWalletApi;
};

export type InstalledExtensions = {
  map: {
    supported: Map<WalletKey, InstalledExtension>;
    unsupported: Map<string, InstalledExtension>;
    all: Map<string, InstalledExtension>;
  };
  arr: {
    supported: InstalledExtension[];
    unsupported: InstalledExtension[];
    all: InstalledExtension[];
  };
};

export function newInstalledExtensions(): InstalledExtensions {
  return {
    map: {
      supported: new Map<WalletKey, InstalledExtension>(),
      unsupported: new Map<string, InstalledExtension>(),
      all: new Map<string, InstalledExtension>(),
    },
    arr: {
      supported: [],
      unsupported: [],
      all: [],
    },
  };
}

export async function getInstalledExtensions(): Promise<InstalledExtensions> {
  const walletExtensions = await getWalletExtensions();
  const res = newInstalledExtensions();

  for (const extension of walletExtensions) {
    const info = getWalletInfo(extension);
    const api: InstalledExtension = { info, defaultApi: extension.defaultApi };
    res.map.all.set(info.key, api);
    res.arr.all.push(api);
    if (info.supported) {
      res.map.supported.set(info.key, api);
      res.arr.supported.push(api);
    } else {
      res.map.unsupported.set(info.key, api);
      res.arr.unsupported.push(api);
    }
  }

  return res;
}
