import { builtinPlugins } from "@ada-anvil/weld/plugins";
import { WeldProvider } from "@ada-anvil/weld/react";
import { hodeiPlugin } from "@ada-anvil/weld-plugin-hodei";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider plugins={[...builtinPlugins, hodeiPlugin()]}>
        <App />
      </WeldProvider>
    </React.StrictMode>,
  );
}
