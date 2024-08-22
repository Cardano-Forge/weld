import { createCustomWallet } from "@/internal/custom/type";
import { runOnce } from "@/internal/utils/run-once";
import { initializeDAppConnectorBridgeAsync } from "./initialize-d-app-connector-bridge-async";

export const eternl = createCustomWallet({
  initialize: runOnce(async () => {
    try {
      if (typeof window === "undefined") {
        return false;
      }
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
});
