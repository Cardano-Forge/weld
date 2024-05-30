import {
  type DefaultWalletApi,
  type SupportedWalletInfo,
  type UnsupportedWalletInfo,
  type WalletKey,
  getWalletExtensions,
  getWalletInfo,
} from "@/lib/utils";

export type InstalledExtensions = {
  supported: Map<
    WalletKey,
    {
      info: SupportedWalletInfo;
      defaultApi: DefaultWalletApi;
    }
  >;
  unsupported: Map<
    string,
    {
      info: UnsupportedWalletInfo;
      defaultApi: DefaultWalletApi;
    }
  >;
};

function newInstalledExtensions(): InstalledExtensions {
  return {
    supported: new Map(),
    unsupported: new Map(),
  };
}

export async function getInstalledExtensions(): Promise<InstalledExtensions> {
  const walletExtensions = await getWalletExtensions();
  const installedExtensions = newInstalledExtensions();

  for (const extension of walletExtensions) {
    const info = getWalletInfo(extension);
    if (info.supported) {
      installedExtensions.supported.set(info.key, {
        info,
        defaultApi: extension.defaultApi,
      });
    } else {
      installedExtensions.unsupported.set(info.key, {
        info,
        defaultApi: extension.defaultApi,
      });
    }
  }

  return installedExtensions;
}
