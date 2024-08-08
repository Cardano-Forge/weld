import { defaults, getPersistedValue } from "@/lib/main";
import { STORAGE_KEYS } from "@/lib/server";
import { weld } from "@/lib/vanilla";

// Disable auto persistence
defaults.enablePersistence = false;

// Manually persist connection
weld.wallet.subscribeWithSelector(
  (state) => state.key,
  (key) => {
    if (key) {
      defaults.storage.set(STORAGE_KEYS.connectedWallet, key);
    } else {
      defaults.storage.remove(STORAGE_KEYS.connectedWallet);
    }
  },
);

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

// Auto reconnect
const lastConnectedWallet = getPersistedValue("connectedWallet");
if (lastConnectedWallet) {
  weld.wallet.getState().connect(lastConnectedWallet);
}
