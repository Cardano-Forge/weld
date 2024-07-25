import { createWalletStore } from "@/lib/main";

const walletStore = createWalletStore();

walletStore.subscribe((state) => {
  console.log("state", state);
});

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
