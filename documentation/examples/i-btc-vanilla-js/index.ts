import { get } from "@/internal/utils/get";
import { identity } from "@/internal/utils/identity";
import { weldBtc } from "@/lib/btc";

weldBtc.extensions.subscribeWithSelector(
  (s) => s.installedArr,
  (installed) => {
    console.log("installed", installed);
  },
);

async function initWallets() {
  const extensions = window.btc_providers ?? [];
  const select = document.querySelector("#wallet-selector select");
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }
  const options = [];
  for (const extension of extensions) {
    const option = document.createElement("option");
    option.value = extension.id;
    option.innerText = extension.name;
    options.push(option);
  }
  if (options.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.innerText = "No wallets";
    options.push(option);
  }
  select.replaceChildren(...options);
}

window.addEventListener("load", () => {
  initWallets();
});

const form = document.querySelector("#wallet-selector");
if (form instanceof HTMLFormElement) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const id = data.get("wallet-key")?.toString();
    console.log("id", id);
    if (!id) {
      return;
    }
    const api = get(window, id);
    console.log("api", api);
    if (
      typeof api !== "object" ||
      api === null ||
      !("request" in api) ||
      typeof api.request !== "function"
    ) {
      console.log("invalid api");
      return;
    }

    try {
      const initMethods = await api.request("supportedMethods", null).catch(identity);
      console.log("init methods", initMethods);

      const addresses = await api.request("getAddresses").catch(identity);
      console.log("addresses", addresses);
      const usersNativeSegwitAddress = addresses.result.addresses.find(
        (a: { type: string }) => a.type === "p2wpkh",
      ).address;
      await fetch(`https://mempool.space/testnet/api/address/${usersNativeSegwitAddress}`)
        .then((r) => r.json())
        .then((j) => console.log("j", j))
        .catch(identity);

      const methods = await api.request("supportedMethods", null).catch(identity);
      console.log("methods", methods);

      const res = await api.request("getAccounts", { purposes: [] }).catch(identity);
      console.log("res", res);

      const accounts = await api.request("getInfo", null).catch(identity);
      console.log("accounts", accounts);

      const balance = await api.request("getBalance", null).catch(identity);
      console.log("balance", balance);
    } catch (error) {
      console.log("error", error);
    }
  });
}

window.addEventListener("load", () => {
  weldBtc.init();
});

window.addEventListener("unload", () => {
  weldBtc.cleanup();
});
