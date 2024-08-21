import { setupStores } from "@/lib/main";
import { weldSol } from "@/lib/sol";

setupStores(weldSol.wallet, weldSol.extensions);

weldSol.wallet.subscribeWithSelector(
  (state) => state.displayName ?? "-",
  (displayName) => {
    console.log("displayName", displayName);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = displayName;
  },
);

// weldSol.wallet.subscribeWithSelector(
//   (state) => state.balanceAda?.toFixed(2) ?? "-",
//   (balance) => {
//     console.log("balance", balance);
//     // biome-ignore lint/style/noNonNullAssertion: We know the element exists
//     document.querySelector("#balance")!.textContent = balance;
//   },
// );

weldSol.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    console.log("isConnectingTo", isConnectingTo);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  weldSol.wallet.getState().connect("phantom");
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldSol.wallet.getState().disconnect();
});
