import type { EvmExtensionPath } from "@/internal/evm/types";

export const ETH_EXTENSIONS = [
  {
    key: "metamask",
    displayName: "Metamask",
    handlerPath: "ethereum",
  },
  {
    key: "phantom",
    displayName: "Phantom",
    handlerPath: "phantom.ethereum",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    handlerPath: "exodus.ethereum",
  },
] as const satisfies readonly EvmExtensionPath[];

export type EthExtensionKey = (typeof ETH_EXTENSIONS)[number]["key"];
