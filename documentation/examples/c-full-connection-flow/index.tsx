import { DialogProvider } from "@/documentation/commons/hooks/dialog.context";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import { WalletProvider } from "@/lib/react";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DialogProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </DialogProvider>
    </React.StrictMode>,
  );
}
