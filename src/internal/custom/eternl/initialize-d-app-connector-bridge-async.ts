import { deferredPromise } from "@/internal/utils/deferred-promise";
import type { DefaultWalletApi } from "@/lib/main";
import { initializeDAppConnectorBridge } from "./initialize-d-app-connector-bridge";

export function initializeDAppConnectorBridgeAsync() {
  const { promise, resolve, reject } = deferredPromise<DefaultWalletApi>();

  const timeout = setTimeout(() => reject("Request took too long"), 5000);

  initializeDAppConnectorBridge((api) => {
    clearTimeout(timeout);
    resolve(api);
  });

  return promise;
}
