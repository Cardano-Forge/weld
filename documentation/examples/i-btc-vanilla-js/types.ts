export type BtcProvider = {
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

declare global {
  interface Window {
    btc_providers?: BtcProvider[];
  }
}
