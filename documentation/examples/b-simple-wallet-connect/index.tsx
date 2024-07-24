import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

import { ToastContainer } from "react-toastify";
import { ExtensionsProvider, WalletProvider } from "@/lib/react";

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
