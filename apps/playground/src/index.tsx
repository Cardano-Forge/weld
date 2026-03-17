import { builtinPlugins } from "@ada-anvil/weld/plugins";
import { WeldProvider } from "@ada-anvil/weld/react";
import { hodeiPlugin } from "@ada-anvil/weld-plugin-hodei";
import React from "react";
import ReactDOM from "react-dom/client";
import { ExampleContainer } from "@/commons/example-container";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider plugins={[...builtinPlugins, hodeiPlugin()]}>
        <ExampleContainer>
          <h1 className="mt-8 text-center text-3xl">Examples</h1>
          <p className="max-w-[800px] mx-auto text-center my-8">
            These samples are not intended as UI demonstrations; they are provided to help
            understand functionalities and code. If you are not a developer, these examples may not
            be applicable to you.
          </p>
          <ul className="flex gap-4 flex-wrap justify-center">
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/a-wallet-state/index.html"
              >
                Wallet states
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/b-simple-wallet-connect/index.html"
              >
                Simple wallet connect
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/c-full-connection-flow/index.html"
              >
                Full connection flow
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/d-other-methods/index.html"
              >
                Other methods
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/e-vanilla-js/index.html"
              >
                Vanilla JS
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/f-sol-vanilla-js/index.html"
              >
                Solana Vanilla JS
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/g-eth-vanilla-js/index.html"
              >
                Ethereum Vanilla JS
              </a>
            </li>
            <li>
              <a
                className="card border p-4 hover:opacity-50 transition-opacity"
                href="/examples/h-poly-vanilla-js/index.html"
              >
                Polygon Vanilla JS
              </a>
            </li>
          </ul>
        </ExampleContainer>
      </WeldProvider>
    </React.StrictMode>,
  );
}
