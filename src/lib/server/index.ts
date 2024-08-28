export const STORAGE_KEYS = {
  connectedWallet: "weld_connected-wallet",
  connectedSolWallet: "weld_connected-sol-wallet",
  connectedEthWallet: "weld_connected-eth-wallet",
  connectedPolyWallet: "weld_connected-poly-wallet",
} as const;

export type StorageKeysType = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
