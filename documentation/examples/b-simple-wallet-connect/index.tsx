import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

import { ExtensionsProvider, WalletProvider } from "@/lib/react";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WalletProvider>
        <ExtensionsProvider>
          <App />
        </ExtensionsProvider>
      </WalletProvider>
      <ToastContainer position="bottom-right" />
    </React.StrictMode>,
  );
}
