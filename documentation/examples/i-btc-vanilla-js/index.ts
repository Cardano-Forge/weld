import { weldBtc } from "@/lib/btc";

weldBtc.extensions.subscribeWithSelector(
  (s) => s.installedArr,
  (extensions) => {
    const select = document.querySelector("#wallet-selector select");
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const options = [];
    for (const extension of extensions) {
      const option = document.createElement("option");
      option.value = extension.info.id;
      option.innerText = extension.info.name;
      options.push(option);
    }
    if (options.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.innerText = "No wallets";
      options.push(option);
    }
    select.replaceChildren(...options);
  },
);

const form = document.querySelector("#wallet-selector");
if (form instanceof HTMLFormElement) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const key = data.get("wallet-key")?.toString();
    if (!key) {
      return;
    }
    try {
      const res = await weldBtc.wallet.connectAsync(key);
      console.log("connection res", res);
    } catch (error) {
      console.log("connection error", error);
    }
  });
}

window.addEventListener("load", () => {
  weldBtc.init();
});

window.addEventListener("unload", () => {
  weldBtc.cleanup();
});
