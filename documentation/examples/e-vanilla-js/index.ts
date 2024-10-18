import { getFailureReason } from "@/internal/utils/errors";
import { weld } from "@/lib/main";

weld.config.getState().update({
  debug: true,
  onUpdateError(context, error) {
    console.log("error", context, getFailureReason(error));
  },
  wallet: {
    // updateInterval: 2000,
  },
  extensions: {
    // updateInterval: false,
  },
  customWallets: {
    blacklist: ["nufiSnap"],
  },
});

weld.extensions.subscribeWithSelector(
  (s) => s.allArr,
  (extensions) => {
    const select = document.querySelector("#wallet-selector select");
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const options = [];
    for (const extension of extensions) {
      const option = document.createElement("option");
      option.value = extension.info.key;
      option.innerText = extension.info.displayName;
      options.push(option);
    }
    if (options.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.innerText = "No wallets";
      options.push(option);
    }
    select.replaceChildren(...options);
  },
);

weld.wallet.subscribeWithSelector(
  (state) => state.displayName ?? "-",
  (displayName) => {
    console.log("displayName", displayName);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = displayName;
  },
);

weld.wallet.subscribeWithSelector(
  (state) => state.balanceAda?.toFixed(2) ?? "-",
  (balance) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

weld.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

const form = document.querySelector("#wallet-selector");
if (form instanceof HTMLFormElement) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const walletKey = data.get("wallet-key")?.toString();
    if (walletKey) {
      weld.wallet.getState().connect(walletKey);
    }
  });
}

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weld.wallet.getState().disconnect();
});

window.addEventListener("load", () => {
  weld.init();
});

window.addEventListener("unload", () => {
  weld.cleanup();
});
