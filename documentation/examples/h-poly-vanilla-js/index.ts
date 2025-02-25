import { weldPoly } from "@/lib/poly";

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
  weldPoly.wallet.connect("metamask", {
    onError(error) {
      console.log("error", error);
    },
  });
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldPoly.wallet.disconnect();
});

document.querySelector("#send")?.addEventListener("click", () => {
  console.log("send");
  weldPoly.wallet.send({ to: "0xAD68508FCb4D5ee8e764b031a695d12830bCc324", amount: "0.0001" });
});

window.addEventListener("load", () => {
  weldPoly.init();
});

window.addEventListener("unload", () => {
  weldPoly.cleanup();
});
