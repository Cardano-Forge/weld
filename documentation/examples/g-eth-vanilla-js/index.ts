import { getFailureReason } from "@/internal/utils/errors";
import { weldEth } from "@/lib/eth";

weldEth.wallet.subscribeWithSelector(
  (state) => state.displayName ?? "-",
  (displayName) => {
    console.log("displayName", displayName);
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = displayName;
  },
);

weldEth.wallet.subscribeWithSelector(
  (state) => state.balanceEth ?? "-",
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

document.querySelector("#getTokenBalance")?.addEventListener("click", async () => {
  try {
    const b = await weldEth.wallet
      .getState()
      .getTokenBalance("0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0");
    console.log("b", b);
  } catch (error) {
    console.log("error", getFailureReason(error));
  }
});

document.querySelector("#getTx")?.addEventListener("click", async () => {
  try {
    const b = await weldEth.wallet
      .getState()
      .provider?.getTransaction(
        "0x1cdf7f6a4a6597fd30f9cee820c7360797653e1a42ec470461475260581a57ec",
      );
    console.log(JSON.stringify(b, null, 2));
  } catch (error) {
    console.log("error", getFailureReason(error));
  }
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldEth.wallet.getState().disconnect();
});

document.querySelector("#send")?.addEventListener("click", () => {
  console.log("send");
  weldEth.wallet.getState().send({
    to: "0xAD68508FCb4D5ee8e764b031a695d12830bCc324",
    amount: "100",
    tokenAddress: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", // PEPE tokens
  });
});

window.addEventListener("load", () => {
  weldEth.init();
});

window.addEventListener("unload", () => {
  weldEth.cleanup();
});
