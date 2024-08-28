import { weldPoly } from "@/lib/poly";
import { setupStores } from "@/lib/main";

setupStores(weldPoly.wallet, weldPoly.extensions);

weldPoly.wallet.subscribeWithSelector(
  (state) => state.displayName ?? "-",
  (displayName) => {
    console.log("displayName", displayName);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = displayName;
  },
);

weldPoly.wallet.subscribeWithSelector(
  (state) => state.balance ?? "-",
  (balance) => {
    console.log("balance", balance);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

weldPoly.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    console.log("isConnectingTo", isConnectingTo);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  console.log("click");
  weldPoly.wallet.getState().connect("metamask", {
    onError(error) {
      console.log("error", error);
    },
  });
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldPoly.wallet.getState().disconnect();
});
