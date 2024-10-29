import type { EvmExtensionInfo } from "@/internal/evm/types";

export const POLY_EXTENSIONS = [
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
] as const satisfies readonly EvmExtensionInfo[];

export type PolyExtensionKey = (typeof POLY_EXTENSIONS)[number]["key"];
