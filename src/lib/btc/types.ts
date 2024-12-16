export type BtcInfo = {
  id: string; // Path on global/window object
  name: string; // Name shown in UI components
  icon: string; // Data URI of an iamge to show in UI components
  webUrl?: string; // URL to website
  chromeWebStoreUrl?: string; // URL to Chrome Web Store Page
  mozillaAddOnsUrl?: string; // URL to Mozilla Add-Ons Page
  googlePlayStoreUrl?: string; // URL to Google Play Store Page
  iOSAppStoreUrl?: string; // URL to iOS App Store Page
  methods?: string[]; // List of methods supported by this provider
};

export type BtcProviderMethods = {
  getAddresses: {
    params: {
      count?: number;
      types?: BtcAddressType[];
      purposes: BtcAddressPurpose[];
    };
    returns: {
      address: string;
      type?: BtcAddressType;
      addressType?: BtcAddressType;
      purpose?: BtcAddressPurpose;
      publicKey?: string;
    };
  };
};

export type BtcAddressType = "p2pkh" | "p2sh" | "p2wpkh-p2sh" | "p2wpkh" | "p2tr";

export type BtcAddressPurpose = "ordinals" | "payment" | "stacks";

export type BtcApi = {
  request: <TMethod extends keyof BtcProviderMethods>(
    method: TMethod,
    params: BtcProviderMethods[TMethod]["params"],
  ) => Promise<{
    jsonrpc: string;
    id: string;
    result: BtcProviderMethods[TMethod]["returns"];
  }>;
};

export type BtcExtension = {
  info: BtcInfo;
  api: BtcApi;
};

export function isBtcApi(obj: unknown): obj is BtcApi {
  return (
    typeof obj === "object" && obj !== null && "request" in obj && typeof obj.request === "function"
  );
}

declare global {
  interface Window {
    btc_providers?: BtcInfo[];
  }
}
