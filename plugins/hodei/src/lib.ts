import {
  DefaultWalletHandler,
  getDefaultWalletConnector,
  runOnce,
} from "@ada-anvil/weld/core";
import type { WeldPlugin } from "@ada-anvil/weld/plugins";
import { initialize } from "hodei-client";

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

export const hodeiPlugin: WeldPlugin = {
  key: "hodei",
  connector: getDefaultWalletConnector(HodeiHandler),
  initialize: runOnce(() => {
    const wallet = initialize({
      onError: (error) => console.error("error", error),
      onClose: (state) => console.log("closed", state),
    });
    console.log("wallet", wallet);
    return !!wallet;
  }),
};
