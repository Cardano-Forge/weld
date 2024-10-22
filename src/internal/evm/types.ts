import type { EthExtensionKey } from "@/lib/eth";
import type { PolyExtensionKey } from "@/lib/poly";
import type { Eip1193Provider } from "ethers";

export enum EvmChainId {
  ETH = "0x1",
  POLY = "0x89",
}

export type EvmApi = Eip1193Provider;

export function isEvmApi(obj: unknown): obj is EvmApi {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

export type EvmExtensionInfo = {
  key: string;
  displayName: string;
  path: string;
};

export type EvmExtension = {
  info: EvmExtensionInfo;
  api: EvmApi;
};

export type EvmExtensionKey = EthExtensionKey | PolyExtensionKey;
