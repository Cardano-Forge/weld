import { createExtensionsStore } from "@/lib/main";

const extensionsStore = createExtensionsStore.vanilla();

extensionsStore.subscribe((state) => {
  console.log("state", state);
});

extensionsStore.subscribeWithSelector(
  (s) => s.allArr,
  (ext) => {
    console.log("ext", ext);
  },
);

import { createWalletStore } from "@/lib/main";

const walletStore = createWalletStore.vanilla();

walletStore.subscribe((state) => {
  console.log("state", state);
});

walletStore.subscribeWithSelector(
  (state) => state.balanceAda?.toFixed(2) ?? "-",
  (balance) => {
    // biome-ignore lint/style/noNonNullAssertion: We know balance exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  walletStore.getState().connect("nami");
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  walletStore.getState().disconnect();
});
