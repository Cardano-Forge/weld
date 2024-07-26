import { weld } from "@/lib/vanilla";

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
  (state) => state.balanceAda?.toFixed(2) ?? "-",
  (balance) => {
    // biome-ignore lint/style/noNonNullAssertion: We know balance exists
    document.querySelector("#balance")!.textContent = balance;
  },
);

document.querySelector("#connect")?.addEventListener("click", () => {
  weld.wallet.getState().connect("eternl");
});

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weld.wallet.getState().disconnect();
});
