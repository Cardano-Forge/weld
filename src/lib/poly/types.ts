import type { EvmExtensionPath } from "@/internal/evm/types";

export const POLY_EXTENSIONS = [
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
] as const satisfies readonly EvmExtensionPath[];

export type PolyExtensionKey = (typeof POLY_EXTENSIONS)[number]["key"];
