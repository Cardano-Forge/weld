import { getDefaultWalletConnector } from "@/internal/connector";
import { DefaultWalletHandler } from "@/internal/handler";
import { deferredPromise } from "@/internal/utils";
import { initializeDAppConnectorBridgeAsync } from "./initialize-d-app-connector-bridge-async";

export class EternlWalletHandler extends DefaultWalletHandler {
  private _initState:
    | { status: "idle" | "initialized" }
    | { status: "loading"; promise: Promise<boolean> } = {
    status: "idle",
  };

  private async _initializeBridge(): Promise<boolean> {
    try {
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

  async initialize() {
    if (this._initState.status === "loading") {
      // Already initializing, return the exisring promise
      return this._initState.promise;
    }
    const { promise, resolve } = deferredPromise<boolean>();
    this._initState = { status: "loading", promise };
    const res = await this._initializeBridge();
    this._initState = { status: res ? "initialized" : "idle" };
    resolve(res);
    return promise;
  }
}

export const eternl = getDefaultWalletConnector(EternlWalletHandler);
