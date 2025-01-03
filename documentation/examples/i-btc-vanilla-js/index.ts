import { weldBtc } from "@/lib/btc";

// weldBtc.config.update({
//   enablePersistence: false,
// });

weldBtc.wallet.subscribeWithSelector(
  (state) => state.name ?? "-",
  (name) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#name")!.textContent = name;
  },
);

weldBtc.wallet.subscribeWithSelector(
  (state) => state.balanceBtc ?? "-",
  (balance) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#balance")!.textContent = String(balance);
  },
);

weldBtc.wallet.subscribeWithSelector(
  (state) => state.paymentAddress ?? "-",
  (address) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#address")!.textContent = address;
  },
);

weldBtc.wallet.subscribeWithSelector(
  (state) => state.publicKey ?? "-",
  (pk) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#pk")!.textContent = pk;
  },
);

weldBtc.wallet.subscribeWithSelector(
  (state) => state.isConnectingTo ?? "-",
  (isConnectingTo) => {
    // biome-ignore lint/style/noNonNullAssertion: We know the element exists
    document.querySelector("#connecting")!.textContent = isConnectingTo;
  },
);

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
      option.value = extension.key;
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
    weldBtc.wallet.connect(key, {
      onError(error) {
        console.log("connection error", error);
      },
      onUpdateError(error) {
        console.log("update error", error);
      },
    });
  });
}

const signMessageForm = document.querySelector("#sign-message");
if (signMessageForm instanceof HTMLFormElement) {
  signMessageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!weldBtc.wallet.isConnected) {
      return;
    }
    const data = new FormData(signMessageForm);
    const message = data.get("message")?.toString();
    if (message?.length) {
      const res = await weldBtc.wallet.signMessage(message);
      console.log("res", res);
    }
  });
}

const signPsbtForm = document.querySelector("#sign-psbt");
if (signPsbtForm instanceof HTMLFormElement) {
  signPsbtForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!weldBtc.wallet.isConnected) {
      return;
    }
    const data = new FormData(signPsbtForm);
    const psbt = data.get("psbt")?.toString();
    if (psbt?.length) {
      const res = await weldBtc.wallet.signPsbt(psbt, {
        inputsToSign: { [weldBtc.wallet.paymentAddress]: [0, 1] },
      });
      console.log("res", res);
    }
  });
}

const sendBitcoinForm = document.querySelector("#send-bitcoin");
if (sendBitcoinForm instanceof HTMLFormElement) {
  sendBitcoinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!weldBtc.wallet.isConnected) {
      return;
    }
    const data = new FormData(sendBitcoinForm);
    const toAddress = data.get("toAddress")?.toString();
    const satoshis = Number(data.get("satoshis")?.toString());
    if (toAddress?.length && !Number.isNaN(satoshis)) {
      const res = await weldBtc.wallet.sendBitcoin(toAddress, satoshis);
      console.log("res", res);
    }
  });
}

document.querySelector("#disconnect")?.addEventListener("click", () => {
  weldBtc.wallet.disconnect();
});

window.addEventListener("load", () => {
  weldBtc.init();
});

window.addEventListener("unload", () => {
  weldBtc.cleanup();
});
