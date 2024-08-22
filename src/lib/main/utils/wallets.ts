import type { WalletExtension } from "./extensions";

type AbstractWalletInfo = {
  supported: boolean;
  key: string;
  icon: string;
  website: string | undefined;
  displayName: string;
  supportsTxChaining: boolean;
};

export const SUPPORTED_WALLETS = [
  {
    supported: true,
    key: "eternl",
    displayName: "Eternl",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/eternl.svg",
    website:
      "https://chrome.google.com/webstore/detail/eternl/kmhcihpebfmpgmihbkipmjlmmioameka?hl=en-US",
    supportsTxChaining: true,
  },
  {
    supported: true,
    key: "nami",
    displayName: "Nami",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/nami.svg",
    website:
      "https://chrome.google.com/webstore/detail/nami/lpfcbjknijpeeillifnkikgncikgfhdo?hl=en-US",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "tokeo",
    displayName: "Tokeo",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/tokeo.svg",
    website: "https://tokeopay.io",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "flint",
    displayName: "Flint",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/flint.svg",
    website:
      "https://chrome.google.com/webstore/detail/flint-wallet/hnhobjmcibchnmglfbldbfabcgaknlkj?hl=en-US",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "gerowallet",
    displayName: "Gero",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/gerowallet.svg",
    website:
      "https://chrome.google.com/webstore/detail/gerowallet/bgpipimickeadkjlklgciifhnalhdjhe/overview",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "typhoncip30",
    displayName: "Typhon",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/typhoncip30.svg",
    website:
      "https://chrome.google.com/webstore/detail/typhon-wallet/kfdniefadaanbjodldohaedphafoffoh",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "nufi",
    displayName: "NuFi",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/nufi.svg",
    website:
      "https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "nufiSnap",
    displayName: "MetaMask",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/nufi-snap.svg",
    website:
      "https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "lace",
    displayName: "Lace",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/lace.svg",
    website:
      "https://chrome.google.com/webstore/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk?hl=en-US",
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "vespr",
    displayName: "VESPR",
    icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/vespr.svg",
    website: "https://www.vespr.xyz/",
    supportsTxChaining: false,
  },
] as const satisfies readonly AbstractWalletInfo[];

export type WalletKey = (typeof SUPPORTED_WALLETS)[number]["key"];

export type WalletInfo =
  | (Omit<AbstractWalletInfo, "key"> & {
      key: WalletKey;
    })
  | (Omit<AbstractWalletInfo, "supported"> & {
      supported: false;
    });

export const supportedWalletsMap = new Map<WalletKey, WalletInfo>(
  SUPPORTED_WALLETS.map((config) => [config.key, config]),
);

export function isWalletKey(str: string): str is WalletKey {
  return supportedWalletsMap.has(str as WalletKey);
}

export function getWalletInfo(extension: WalletExtension): WalletInfo {
  const info = supportedWalletsMap.get(extension.key as WalletKey);
  if (info) {
    return info;
  }
  return {
    supported: false,
    key: extension.key,
    icon: extension.defaultApi.icon,
    displayName: extension.defaultApi.name,
    website: undefined,
    supportsTxChaining: false,
  };
}
