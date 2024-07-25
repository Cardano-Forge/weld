import { createCustomWallet } from "@/internal/custom/type";
import { deferredPromise } from "@/internal/utils/deferred-promise";
import { initializeDAppConnectorBridgeAsync } from "./initialize-d-app-connector-bridge-async";

type InitStatus =
  | { status: "idle" | "initialized" }
  | { status: "loading"; promise: Promise<void> };

let state: InitStatus = { status: "idle" };

async function initializeBridge(): Promise<boolean> {
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
}

export const eternl = createCustomWallet({
  async initialize() {
    if (state.status === "loading") {
      // Already initializing, return the existing promise
      return state.promise;
    }
    const { promise, resolve } = deferredPromise<void>();
    state = { status: "loading", promise };
    const res = await initializeBridge();
    state = { status: res ? "initialized" : "idle" };
    resolve();
    return promise;
  },
});
