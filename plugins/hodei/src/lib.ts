import { type Config, initialize } from "@ada-anvil/hodei-client";
import {
  DefaultWalletHandler,
  getDefaultWalletConnector,
  runOnce,
} from "@ada-anvil/weld/core";
import type { WeldPlugin } from "@ada-anvil/weld/plugins";

class HodeiHandler extends DefaultWalletHandler {
  async disconnect(): Promise<void> {
    if (
      "disconnect" in this.enabledApi &&
      typeof this.enabledApi.disconnect === "function"
    ) {
      return this.enabledApi?.disconnect();
    }
  }
}

export function hodeiPlugin(config?: Partial<Config>): WeldPlugin {
  return {
    key: "hodei",
    connector: getDefaultWalletConnector(HodeiHandler),
    initialize: runOnce(() => !!initialize(config)),
  };
}
