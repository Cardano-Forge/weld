import type { WeldPlugin } from "@/internal/plugins/types";
import { runOnce } from "@/internal/utils/run-once";

export const eternlPlugin: WeldPlugin = {
  key: "eternl",
  initialize: runOnce(async () => {
    try {
      if (typeof window === "undefined") {
        return false;
      }
      const { initializeDAppConnectorBridgeAsync } = await import(
        "./initialize-d-app-connector-bridge-async"
      );
      const walletApi = await initializeDAppConnectorBridgeAsync();
      if (walletApi.name === "eternl") {
        window.cardano.eternl = walletApi;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }),
};
