import type { EthExtensionKey } from "@/lib/eth";
import type { WeldConfig } from "@/lib/main/stores/config";
import type { PolyExtensionKey } from "@/lib/poly";
import type { Eip1193Provider } from "ethers";

export const evmChainIds = {
  eth: "0x1",
  poly: "0x89",
} as const;

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

export type EvmConfig = Omit<WeldConfig, "customWallets">;
