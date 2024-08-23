import type { Eip1193Provider } from "ethers";

export type EthHandler = Eip1193Provider;

export function isEthHandler(obj: unknown): obj is EthHandler {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

export type EthExtensionInfo = {
  key: string;
  displayName: string;
};

export type EthExtension = EthExtensionInfo & {
  handlerPath: string;
  isInstalled: boolean;
  handler?: EthHandler;
};

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
] as const satisfies readonly Omit<EthExtension, "isInstalled" | "handler">[];

export type EthExtensionKey = (typeof ETH_EXTENSIONS)[number]["key"];
