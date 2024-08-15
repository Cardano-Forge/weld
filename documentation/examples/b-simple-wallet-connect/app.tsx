import { ExampleContainer } from "@/documentation/commons/example-container";
import { SUPPORTED_WALLETS } from "@/lib/main";
import { WeldProvider, useExtensions, useWallet } from "@/lib/react";
import { useState } from "react";
// import { useEffect } from "react";

const Connected = () => {
  const connectedTo = useWallet((state) => state.key);
  //  useEffect(() => console.log("isConnected"));
  return <div>Connected {connectedTo ?? "-"}</div>;
};

const ConnectingTo = () => {
  const isConnectingTo = useWallet("isConnectingTo");
  //  useEffect(() => console.log("isConnectingTo"));
  return <div>Connecting to {isConnectingTo ?? "-"}</div>;
};

const Balance = () => {
  const balance = useWallet((state) => state.balanceAda?.toFixed(2));
  //  useEffect(() => console.log("balance"));
  return <div>Balance {balance ?? "-"}</div>;
};

export const Wallet = () => {
  const connect = useWallet((state) => state.connect);
  return (
    <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
      <div className="card-body text-center">
        <div className="flex flex-wrap gap-4">
          {SUPPORTED_WALLETS.map(({ key, displayName }) => (
            <button
              key={key}
              type="button"
              className="btn btn-primary"
              onClick={() => connect(key)}
            >
              {displayName}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-start my-4 gap-2">
          <Connected />
          <ConnectingTo />
          <Balance />
        </div>
      </div>
    </article>
  );
};

export const Extensions = () => {
  const extensions = useExtensions((state) => state.allArr);
  const update = useExtensions("update");
  //  useEffect(() => console.log("extensions updated"));
  return (
    <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
      <div className="card-body text-center">
        Installed extensions
        <ul>
          {extensions.map((ext) => (
            <li key={ext.info.key}>{ext.info.displayName}</li>
          ))}
        </ul>
        <button type="button" onClick={() => update()}>
          Update extensions
        </button>
      </div>
    </article>
  );
};

function onUpdateError(error: unknown) {
  console.log("extensions error", error);
}

export const App = () => {
  const [c, setC] = useState(0);
  const [updateOnWindowFocus, setUpdateOnWindowFocus] = useState(true);

  return (
    <WeldProvider
      onUpdateError={(store, error) => {
        console.log("global", store, error);
      }}
      updateOnWindowFocus={updateOnWindowFocus}
      wallet={{
        updateInterval: false,
        onUpdateError: (error) => {
          if (c < 4) {
            console.log("wallet error", error);
            setC((p) => p + 1);
          }
        },
      }}
      extensions={{ onUpdateError }}
    >
      <ExampleContainer>
        <Extensions />
        <Wallet />
        <button type="button" onClick={() => setUpdateOnWindowFocus((p) => !p)}>
          Update on window focus? {!updateOnWindowFocus}
        </button>
      </ExampleContainer>
    </WeldProvider>
  );
};
