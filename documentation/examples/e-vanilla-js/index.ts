import { defaults, getPersistedValue } from "@/lib/main";
import { weld } from "@/lib/vanilla";

// Disable auto persistence
defaults.enablePersistence = false;

// Manually persist connection
weld.wallet.subscribeWithSelector(
  (state) => state.key,
  (key) => {
    if (key) {
      defaults.storage.set("connectedWallet", key);
    } else {
      defaults.storage.remove("connectedWallet");
    }
  },
);

// Auto reconnect
const lastConnectedWallet = getPersistedValue("connectedWallet");
if (lastConnectedWallet) {
  weld.wallet.getState().connect(lastConnectedWallet);
}

defaults.extensions = {
  updateInterval: false,
};

weld.extensions.subscribe((state) => {
  console.log("state", state);
});

weld.extensions.subscribeWithSelector(
  (s) => s.allArr,
  (ext) => {
    console.log("ext", ext);
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
    console.log("balance", balance);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  weld.wallet.getState().connect("nami");
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weld.wallet.getState().disconnect();
});
