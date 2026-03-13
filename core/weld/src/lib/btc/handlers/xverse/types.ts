import type { AnyFunction } from "@/internal/utils/types";

export type WalletType = "software" | "ledger";

export type AddressPurpose = "ordinals" | "payment" | "stacks";

export type AddressType = "p2pkh" | "p2sh" | "p2wpkh" | "p2wsh" | "p2tr" | "stacks";

export type Protocol = "ECDSA" | "BIP322";

export type Address = {
  address: string;
  publicKey: string;
  purpose: AddressPurpose;
  addressType: AddressType;
};

export type XverseRequest = {
  getInfo: {
    params: null | undefined;
    result: {
      version: string;
      methods?: string[];
      supports: string[];
    };
  };
  getAddresses: {
    params: {
      purposes: AddressPurpose[];
      message?: string;
    };
    result: {
      addresses: Address[];
    };
  };
  signMessage: {
    params: {
      address: string;
      message: string;
      protocol?: Protocol;
    };
    result: {
      signature: string;
      messageHash: string;
      address: string;
      protocol: Protocol;
    };
  };
  sendTransfer: {
    params: {
      recipients: {
        address: string;
        amount: number;
      }[];
    };
    result: {
      txid: string;
    };
  };
  signPsbt: {
    params: {
      psbt: string;
      signInputs: { [address: string]: number[] };
      broadcast?: boolean;
    };
    result: {
      psbt: string;
      txid?: string;
    };
  };
  getAccounts: {
    params: {
      purposes: AddressPurpose[];
      message?: string;
    };
    result: (Address & {
      walletType: WalletType;
    })[];
  };
  getBalance: {
    params: null | undefined;
    result: {
      confirmed: string;
      unconfirmed: string;
      total: string;
    };
  };
  wallet_requestPermissions: {
    params: null | undefined;
    result: null | undefined;
  };
  wallet_renouncePermissions: {
    params: null | undefined;
    result: null | undefined;
  };

  wallet_getCurrentPermissions: {
    params: null | undefined;
    result: (
      | {
          type: "account";
          resourceId: string;
          clientId: string;
          actions: { read?: boolean };
        }
      | {
          type: "wallet";
          resourceId: string;
          clientId: string;
          actions: Record<string, never>;
        }
    )[];
  };
  ord_getInscriptions: {
    params: {
      offset: number;
      limit: number;
    };
    result: {
      total: number;
      limit: number;
      offset: number;
      inscriptions: {
        inscriptionId: string;
        inscriptionNumber: string;
        address: string;
        collectionName?: string;
        postage: string;
        contentLength: string;
        contentType: string;
        timestamp: number;
        offset: number;
        genesisTransaction: string;
        output: string;
      }[];
    };
  };
  ord_sendInscriptions: {
    params: {
      transfers: {
        address: string;
        inscriptionId: string;
      }[];
    };
    result: {
      txid: string;
    };
  };
};

export type XverseApi = {
  request: <T extends keyof XverseRequest>(
    method: T,
    params: XverseRequest[T]["params"],
  ) => Promise<{ result: XverseRequest[T]["result"] } | { error: Error }>;
  addListener?(event: string, cb: AnyFunction): void;
};

export function isXverseApi(obj: unknown): obj is XverseApi {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}
