import { createExtensionsStore, createWalletStore } from "@/lib/main";

const walletStore = createWalletStore();

const extensionsStore = createExtensionsStore();

extensionsStore.subscribe((state) => {
  console.log("state", state);
});

extensionsStore.subscribeWithSelector(
  (s) => s.allArr.length,
  (ext) => {
    console.log("ext", ext);
  },
);

setInterval(() => {
  extensionsStore.getState().update();
}, 2000);

// walletStore.subscribe((state) => {
//   console.log("state", state);
// });

walletStore.subscribeWithSelector(
  (state) => state.balance?.ada.toFixed(2) ?? "-",
  (balance) => {
    // biome-ignore lint/style/noNonNullAssertion: We know balance exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

const connectEl = document.querySelector("#connect");
if (connectEl && connectEl instanceof HTMLButtonElement) {
  connectEl.addEventListener("click", () => {
    walletStore.getState().connect("nami");
  });
}
