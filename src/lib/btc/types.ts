import type { Prettify } from "@/internal/utils/types";

export type BtcExtensionInfo = {
  id: string; // Path on global/window object
  name: string; // Name shown in UI components
  icon: string; // Data URI of an iamge to show in UI components
  webUrl?: string; // URL to website
  chromeWebStoreUrl?: string; // URL to Chrome Web Store Page
  mozillaAddOnsUrl?: string; // URL to Mozilla Add-Ons Page
  googlePlayStoreUrl?: string; // URL to Google Play Store Page
  iOSAppStoreUrl?: string; // URL to iOS App Store Page
  methods?: (keyof BtcProviderMethods)[]; // List of methods supported by this provider
};

export type BtcProviderMethods = {
  getAddresses: {
    params: {
      count?: number;
      types?: BtcAddressType[];
      purposes: BtcAddressPurpose[];
    };
    returns: {
      addresses: {
        address: string;
        type?: BtcAddressType;
        addressType?: BtcAddressType;
        purpose?: BtcAddressPurpose;
        publicKey?: string;
      }[];
    };
  };
  getBalance: {
    returns: {
      confirmed: string | number;
      total: string | number;
      unconfirmed: string | number;
    };
  };
  wallet_connect: {
    returns: BtcExtensionInfo;
  };
  getInfo: {
    returns: {
      methods?: (keyof BtcProviderMethods)[];
    };
  };
};

export type BtcAddressType = "p2pkh" | "p2sh" | "p2wpkh-p2sh" | "p2wpkh" | "p2tr";

export type BtcAddressPurpose = "ordinals" | "payment" | "stacks";

export type RpcResult<TMethod extends keyof BtcProviderMethods> = Prettify<
  { jsonrpc: string; id: string } & (
    | { result: BtcProviderMethods[TMethod]["returns"]; error?: undefined }
    | { error: unknown; result?: undefined }
  )
>;

export type BtcApi = {
  request: <TMethod extends keyof BtcProviderMethods>(
    method: TMethod,
    ...params: BtcProviderMethods[TMethod] extends { params: infer TParams } ? [TParams] : []
  ) => Promise<RpcResult<TMethod>>;
};

export type BtcExtension = {
  info: BtcExtensionInfo;
  api: BtcApi;
};

export function isBtcApi(obj: unknown): obj is BtcApi {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

declare global {
  interface Window {
    btc_providers?: BtcExtensionInfo[];
  }
}
