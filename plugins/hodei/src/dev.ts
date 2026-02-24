import { type WalletStoreState, weld } from "@ada-anvil/weld";
import { builtinPlugins } from "@ada-anvil/weld/plugins";
import { hodeiPlugin } from "./lib";

weld.config.update({
  debug: true,
  plugins: [...builtinPlugins, hodeiPlugin],
  onUpdateError(context, error) {
    console.error(context, error);
  },
});

weld.wallet.subscribe((wallet) => {
  const statusEl = document.querySelector("#status");
  if (statusEl) statusEl.textContent = getStatus(wallet);
  const nameEl = document.querySelector("#name");
  if (nameEl) nameEl.textContent = wallet.displayName ?? "-";
  const balanceEl = document.querySelector("#balance");
  if (balanceEl) balanceEl.textContent = (wallet.balanceAda ?? "-").toString();
});

document.querySelector("#connect")?.addEventListener("click", async () => {
  weld.wallet.connect("hodei", {
    onError: console.error,
  });
});

document.querySelector("#disconnect")?.addEventListener("click", async () => {
  weld.wallet.disconnect();
});

window.addEventListener("load", () => {
  weld.init();
});

function getStatus(wallet: WalletStoreState): string {
  if (wallet.isConnected) {
    return "connected";
  }
  if (wallet.isConnecting) {
    return "connecting";
  }
  return "disconnected";
}
