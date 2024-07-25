import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

import { WeldProvider } from "@/lib/react";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider>
        <App />
      </WeldProvider>
      <ToastContainer position="bottom-right" />
    </React.StrictMode>,
  );
}
