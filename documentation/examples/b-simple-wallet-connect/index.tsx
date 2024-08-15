import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";
import { weld } from "@/lib/main";

const disconnect = document.querySelector("#disconnect");
if (disconnect instanceof HTMLButtonElement) {
  disconnect.addEventListener("click", () => {
    weld.wallet.getState().disconnect();
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
