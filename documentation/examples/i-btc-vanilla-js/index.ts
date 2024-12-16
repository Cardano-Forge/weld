import { weldBtc } from "@/lib/btc";

weldBtc.config.update({
  enablePersistence: false,
});

weldBtc.wallet.subscribeWithSelector(
  (state) => state.name ?? "-",
  (name) => {
    console.log("displayName", name);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = name;
  },
);

weldBtc.wallet.subscribeWithSelector(
  (state) => state.balanceBtc ?? "-",
  (balance) => {
    console.log("balance", balance);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = String(balance);
  },
);

weldBtc.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    console.log("isConnectingTo", isConnectingTo);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

weldBtc.extensions.subscribeWithSelector(
  (s) => s.installedArr,
  (extensions) => {
    const select = document.querySelector("#wallet-selector select");
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const options = [];
    for (const extension of extensions) {
      const option = document.createElement("option");
      option.value = extension.info.id;
      option.innerText = extension.info.name;
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

const form = document.querySelector("#wallet-selector");
if (form instanceof HTMLFormElement) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const key = data.get("wallet-key")?.toString();
    if (!key) {
      return;
    }
    weldBtc.wallet.connect(key, {
      onError(error) {
        console.log("connection error", error);
      },
    });
  });
}

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldBtc.wallet.disconnect();
});

window.addEventListener("load", () => {
  weldBtc.init();
});

window.addEventListener("unload", () => {
  weldBtc.cleanup();
});
