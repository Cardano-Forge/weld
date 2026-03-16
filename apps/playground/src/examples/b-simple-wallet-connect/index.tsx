import React from "react";
import ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import { App } from "./app";

import "react-toastify/dist/ReactToastify.min.css";
import { weld } from "@ada-anvil/weld";

const disconnect = document.querySelector("#disconnect");
if (disconnect instanceof HTMLButtonElement) {
  disconnect.addEventListener("click", () => {
    weld.wallet.disconnect();
  });
}

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
      <ToastContainer position="bottom-right" />
    </React.StrictMode>,
  );
}
