import type { EthExtensionKey } from "@/lib/eth";
import type { PolyExtensionKey } from "@/lib/poly";
import type { Eip1193Provider } from "ethers";

export enum EvmChainId {
  ETH = "0x1",
  POLY = "0x89",
}

export type EvmHandler = Eip1193Provider;

export function isEvmHandler(obj: unknown): obj is EvmHandler {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

export type EvmExtensionInfo = {
  key: string;
  displayName: string;
};

export type EvmExtension = EvmExtensionInfo & {
  handlerPath: string;
  isInstalled: boolean;
  handler?: EvmHandler;
};

export type EvmExtensionPath = Omit<EvmExtension, "isInstalled" | "handler">;

export type EvmExtensionKey = EthExtensionKey | PolyExtensionKey;
