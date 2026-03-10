import { createWeldInstance, type WalletStoreState } from "@ada-anvil/weld";
import { builtinPlugins } from "@ada-anvil/weld/plugins";
import { hodeiPlugin } from "./lib";

const weld = createWeldInstance();

weld.config.update({
  debug: true,
  plugins: [...builtinPlugins, hodeiPlugin()],
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

weld.extensions.subscribeWithSelector(
  (extensions) => extensions.registeredArr,
  (registeredArr) => {
    console.log("registered wallets:", registeredArr.length);
    const placeholder = document.createElement("option");
    placeholder.innerText = "select wallet";
    placeholder.value = "";
    document.querySelector("select")?.replaceChildren(
      placeholder,
      ...registeredArr.map((wallet) => {
        const option = document.createElement("option");
        option.innerText = wallet.displayName;
        option.value = wallet.key;
        return option;
      }),
    );
  },
  { fireImmediately: true },
);

document.querySelector("#connect")?.addEventListener("click", async () => {
  const selectEl = document.querySelector("select");
  if (selectEl instanceof HTMLSelectElement && selectEl.value.length > 0) {
    weld.wallet.connect(selectEl.value, { onError: console.error });
  }
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
