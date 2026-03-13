import type { EvmExtensionInfo } from "@/internal/evm/types";

export const ETH_EXTENSIONS = [
  {
    key: "metamask",
    displayName: "Metamask",
    path: "ethereum",
  },
  {
    key: "phantom",
    displayName: "Phantom",
    path: "phantom.ethereum",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    path: "exodus.ethereum",
  },
] as const satisfies readonly EvmExtensionInfo[];

export type EthExtensionKey = (typeof ETH_EXTENSIONS)[number]["key"];
