import { DialogProvider } from "@/documentation/commons/hooks/dialog.context";
import { WeldProvider } from "@/lib/react/contexts/weld.context";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider
        config={{
          wallet: {
            onUpdateError(error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "An unknown error occured while updating the wallet state";
              toast.error(message, { toastId: "wallet-update" });
            },
          },
        }}
      >
        <DialogProvider>
          <App />
        </DialogProvider>
      </WeldProvider>
      <ToastContainer position="bottom-right" />
    </React.StrictMode>,
  );
}
