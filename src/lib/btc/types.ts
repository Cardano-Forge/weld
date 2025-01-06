import type { UnsubscribeFct } from "@/internal/lifecycle";
import type { MaybePromise } from "@/internal/utils/types";
import type { BitcoinProvider, Provider, SatsConnectAdapter } from "@sats-connect/core";

export type BtcExtensionInfo = Provider;

export type BtcApi = Record<string, unknown>;

export function isBtcApi(obj: unknown): obj is BtcApi {
  return typeof obj === "object" && obj !== null;
}

export type BtcExtension = BtcWalletDef & {
  api: BtcApi;
};

export type GetBalanceResult = {
  confirmed: number;
  unconfirmed: number;
  total: number;
};

export type BtcWalletEvent = "accountChange" | "networkChange";

export type SignMessageOpts = {
  protocol: "ecdsa" | "bip322";
};
export type SignMessageResult = {
  signature: string;
};

type Address = string;
type InputIndex = number;
export type SignPsbtOpts = {
  inputsToSign: Record<Address, InputIndex | InputIndex[]>;
};
export type SignPsbtResult = {
  signedPsbtHex: string;
};

export type SendBitcoinResult = {
  txId: string;
};

export type Inscription = {
  inscriptionId: string;
  inscriptionNumber: number;
  address: string;
  contentLength: number;
  contentType: string;
  timestamp: number;
  genesisTransaction: string;
  output: string;
  offset: number;
};
export type GetInscriptionsOpts = {
  limit?: number;
  offset?: number;
};
export type GetInscriptionsResult = {
  total: number;
  results: Inscription[];
};

export type SendInscriptionResult = {
  txId: string;
};

export interface BtcWalletHandler {
  getBalance(): Promise<GetBalanceResult>;
  getPaymentAddress(): Promise<string>;
  getPublicKey(): Promise<string>;
  getInscriptions(opts?: GetInscriptionsOpts): Promise<GetInscriptionsResult>;
  sendInscription(toAddress: string, inscriptionId: string): Promise<SendInscriptionResult>;
  signMessage(message: string, opts?: SignMessageOpts): Promise<SignMessageResult>;
  signPsbt(psbtHex: string, opts: SignPsbtOpts): Promise<SignPsbtResult>;
  sendBitcoin(toAddress: string, satoshis: number): Promise<SendBitcoinResult>;
  disconnect?(): MaybePromise<void>;
  on?(event: BtcWalletEvent, handler: () => void): UnsubscribeFct;
}

export function isBtcProvider(obj: unknown): obj is BitcoinProvider {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

export type BtcWalletDef = {
  key: string;
  info: Provider;
  Adapter: new () => SatsConnectAdapter;
  connect(opts?: { adapter?: SatsConnectAdapter }): Promise<BtcWalletHandler>;
};
