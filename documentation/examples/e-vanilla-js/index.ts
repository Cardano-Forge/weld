import { createWalletStore } from "@/lib/main";

const walletStore = createWalletStore();

walletStore.subscribe((state) => {
  const balanceEl = document.querySelector("#balance");
  if (balanceEl) {
    const balance = Number(balanceEl.textContent);
    if (Number.isNaN(balance) || state.balance?.ada !== balance) {
      balanceEl.textContent = state.balance?.ada.toString() ?? "-";
    }
  }
});

const connectEl = document.querySelector("#connect");
if (connectEl && connectEl instanceof HTMLButtonElement) {
  connectEl.addEventListener("click", () => {
    walletStore.getState().connect("nami");
  });
}
