import { ExampleContainer } from "@/documentation/commons/example-container";
import { WeldProvider } from "@/lib/react/contexts/weld.context";
import React from "react";
import ReactDOM from "react-dom/client";
import { DialogProvider } from "./commons/hooks/dialog.context";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider>
        <DialogProvider>
          <ExampleContainer>
            <h1 className="mt-8 text-center text-3xl">Examples</h1>
            <p className="max-w-[800px] mx-auto text-center my-8">
              These samples are not intended as UI demonstrations; they are provided to help
              understand functionalities and code. If you are not a developer, these examples may
              not be applicable to you.
            </p>
            <ul className="flex gap-4 flex-wrap justify-center">
              <li>
                <a
                  className="card border p-4 hover:opacity-50 transition-opacity"
                  href="/documentation/examples/a-wallet-state/index.html"
                >
                  Wallet states
                </a>
              </li>
              <li>
                <a
                  className="card border p-4 hover:opacity-50 transition-opacity"
                  href="/documentation/examples/b-simple-wallet-connect/index.html"
                >
                  Simple wallet connect
                </a>
              </li>
              <li>
                <a
                  className="card border p-4 hover:opacity-50 transition-opacity"
                  href="/documentation/examples/c-full-connection-flow/index.html"
                >
                  Full connection flow
                </a>
              </li>
              <li>
                <a
                  className="card border p-4 hover:opacity-50 transition-opacity"
                  href="/documentation/examples/d-other-methods/index.html"
                >
                  Other methods
                </a>
              </li>
            </ul>
          </ExampleContainer>
        </DialogProvider>
      </WeldProvider>
    </React.StrictMode>,
  );
}
