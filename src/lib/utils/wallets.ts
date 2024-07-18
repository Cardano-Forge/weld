import type { WalletExtension } from "./extensions";

type AbstractWalletInfo = {
  supported: true;
  key: string;
  icon: string;
  website: string | undefined;
  displayName: string;
  description: string | undefined;
  supportsTxChaining: boolean;
};

export const SUPPORTED_WALLETS = [
  {
    supported: true,
    key: "eternl",
    displayName: "Eternl",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/eternl.svg",
    website:
      "https://chrome.google.com/webstore/detail/eternl/kmhcihpebfmpgmihbkipmjlmmioameka?hl=en-US",
    description: undefined,
    supportsTxChaining: true,
  },
  {
    supported: true,
    key: "nami",
    displayName: "Nami",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/nami.svg",
    website:
      "https://chrome.google.com/webstore/detail/nami/lpfcbjknijpeeillifnkikgncikgfhdo?hl=en-US",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "tokeo",
    displayName: "Tokeo",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/tokeo.svg",
    website: "https://tokeopay.io",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "flint",
    displayName: "Flint",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/flint.svg",
    website:
      "https://chrome.google.com/webstore/detail/flint-wallet/hnhobjmcibchnmglfbldbfabcgaknlkj?hl=en-US",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "gerowallet",
    displayName: "Gero",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/gerowallet.svg",
    website:
      "https://chrome.google.com/webstore/detail/gerowallet/bgpipimickeadkjlklgciifhnalhdjhe/overview",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "typhoncip30",
    displayName: "Typhon",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/typhoncip30.svg",
    website:
      "https://chrome.google.com/webstore/detail/typhon-wallet/kfdniefadaanbjodldohaedphafoffoh",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "nufi",
    displayName: "NuFi",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/nufi.svg",
    website:
      "https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "lace",
    displayName: "Lace",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/lace.svg",
    website:
      "https://chrome.google.com/webstore/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk?hl=en-US",
    description: undefined,
    supportsTxChaining: false,
  },
  {
    supported: true,
    key: "vespr",
    displayName: "VESPR",
    icon: "https://raw.githubusercontent.com/cardano-forge/universal-wallet-connector/main/images/wallets/vespr.svg",
    website: "https://www.vespr.xyz/",
    description: undefined,
    supportsTxChaining: false,
  },
] as const satisfies AbstractWalletInfo[];

export type WalletKey = (typeof SUPPORTED_WALLETS)[number]["key"];

export type WalletInfo =
  | (Omit<AbstractWalletInfo, "key"> & {
      key: WalletKey;
    })
  | (Omit<AbstractWalletInfo, "supported"> & {
      supported: false;
    });

export type SupportedWalletInfo = Extract<WalletInfo, { supported: true }>;

export type UnsupportedWalletInfo = Extract<WalletInfo, { supported: false }>;

export const supportedWalletsMap = new Map<WalletKey, SupportedWalletInfo>(
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
    description: undefined,
    website: undefined,
    supportsTxChaining: false,
  };
}
