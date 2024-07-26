import { createWalletStore } from "@/lib/main";

// const extensionsStore = createExtensionsStore();

// extensionsStore.subscribe((state) => {
//   console.log("state", state);
// });

// extensionsStore.subscribeWithSelector(
//   (s) => s.allArr.length,
//   (ext) => {
//     console.log("ext", ext);
//   },
// );

// setInterval(() => {
//   extensionsStore.getState().update();
// }, 2000);

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
