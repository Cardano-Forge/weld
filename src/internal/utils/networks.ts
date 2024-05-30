import type { NetworkId, NetworkType } from "@/lib/utils";

export const Networks = new Map<NetworkId, NetworkType>([
  [1, "mainnet"],
  [0, "preprod"],
]);

export const getNetworkType = (key: NetworkId): NetworkType => {
  const value = Networks.get(key);

  if (!value) throw new Error("Network ID does not exists");

  return value;
};
