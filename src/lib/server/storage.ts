export const STORAGE_KEYS = {
  connectedWallet: "weld_connected-wallet",
  connectedChange: "weld_connected-change",
  connectedStake: "weld_connected-stake",
  connectedSolWallet: "weld_connected-sol-wallet",
  connectedEthWallet: "weld_connected-eth-wallet",
  connectedPolyWallet: "weld_connected-poly-wallet",
  connectedBtcWallet: "weld_connected-btc-wallet",
} as const;

export type StorageKeysType = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
