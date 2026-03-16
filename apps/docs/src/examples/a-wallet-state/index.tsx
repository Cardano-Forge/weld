import { WeldProvider } from "@ada-anvil/weld/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider>
        <App />
      </WeldProvider>
    </React.StrictMode>,
  );
}
