import { weldSol } from "@/lib/sol";

weldSol.wallet.subscribeWithSelector(
  (state) => state.displayName ?? "-",
  (displayName) => {
    console.log("displayName", displayName);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = displayName;
  },
);

weldSol.wallet.subscribeWithSelector(
  (state) => state.balance?.toFixed(2) ?? "-",
  (balance) => {
    console.log("balance", balance);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

weldSol.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    console.log("isConnectingTo", isConnectingTo);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  console.log("click");
  weldSol.wallet.getState().connect("phantom", {
    onError(error) {
      console.log("error", error);
    },
  });
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldSol.wallet.getState().disconnect();
});

document.querySelector("#send")?.addEventListener("click", () => {
  console.log("send");
  weldSol.wallet.getState().send({
    to: "3rTMfB64SpBvnA2ErfSSs7zYa9sHJciVw2uaWuCmb7Gd",
    amount: "0.1",
    tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // Bonk token
  });
});

window.addEventListener("load", () => {
  weldSol.init();
});

window.addEventListener("unload", () => {
  weldSol.cleanup();
});
