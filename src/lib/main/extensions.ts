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
  supported: Map<WalletKey, InstalledExtension>;
  unsupported: Map<string, InstalledExtension>;
  all: Map<string, InstalledExtension>;
};

export async function getInstalledExtensions(): Promise<InstalledExtensions> {
  const walletExtensions = await getWalletExtensions();
  const supported = new Map<WalletKey, InstalledExtension>();
  const unsupported = new Map<string, InstalledExtension>();
  const all = new Map<string, InstalledExtension>();

  for (const extension of walletExtensions) {
    const info = getWalletInfo(extension);
    const api: InstalledExtension = { info, defaultApi: extension.defaultApi };
    all.set(info.key, api);
    if (info.supported) {
      supported.set(info.key, api);
    } else {
      unsupported.set(info.key, api);
    }
  }

  return {
    supported,
    unsupported,
    all,
  };
}
