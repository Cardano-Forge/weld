export type WalletConfig = {
  overwriteExistingConnection: boolean;
  pollInterval: number | false;
  updateOnWindowFocus: boolean;
  allowMultipleConnections: boolean;
};

export type WeldConfig = {
  ignoreUnsafeUsageError: boolean;
  wallet: WalletConfig;
};

export const defaults: WeldConfig = {
  ignoreUnsafeUsageError: false,
  wallet: {
    overwriteExistingConnection: false,
    pollInterval: 2000,
    updateOnWindowFocus: true,
    allowMultipleConnections: false,
  },
};
