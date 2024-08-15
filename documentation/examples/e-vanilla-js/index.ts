import { setupStores, weld } from "@/lib/main";

setupStores(weld.wallet, weld.extensions);

weld.config.getState().update({
  extensions: {
    updateInterval: false,
  },
});

weld.wallet.subscribeWithSelector(
  (s) => s.utxos,
  (utxos) => console.log("utxos", utxos),
);

weld.wallet.subscribeWithSelector(
  (s) => s.isConnecting,
  (isConnecting) => console.log("isConnecting", isConnecting),
);

weld.wallet.subscribeWithSelector(
  (s) => s.isUpdatingUtxos,
  (isUpdatingUtxos) => console.log("isUpdatingUtxos", isUpdatingUtxos),
);

weld.extensions.subscribeWithSelector(
  (s) => s.allArr,
  (ext) =>
    console.log(
      "ext",
      ext.map((e) => e.info.displayName),
    ),
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
    console.log("balance", balance);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

weld.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    console.log("isConnectingTo", isConnectingTo);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  weld.wallet.getState().connect("nami");
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weld.wallet.getState().disconnect();
});
