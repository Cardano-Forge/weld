import { weldEth } from "@/lib/eth";
import { setupStores } from "@/lib/main";

setupStores(weldEth.wallet, weldEth.extensions);

weldEth.wallet.subscribeWithSelector(
  (state) => state.displayName ?? "-",
  (displayName) => {
    console.log("displayName", displayName);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = displayName;
  },
);

weldEth.wallet.subscribeWithSelector(
  (state) => state.balance ?? "-",
  (balance) => {
    console.log("balance", balance);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

weldEth.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    console.log("isConnectingTo", isConnectingTo);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  console.log("click");
  weldEth.wallet.getState().connect("metamask", {
    onError(error) {
      console.log("error", error);
    },
  });
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldEth.wallet.getState().disconnect();
});
