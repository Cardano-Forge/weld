import { ExampleContainer } from "@/documentation/commons/example-container";
import { useExtensionsDerived } from "@/lib/react";
import { useWallet } from "@/lib/react/wallet";
import { SUPPORTED_WALLETS } from "@/lib/utils";
import { useEffect } from "react";

const Connected = () => {
  const isConnected = useWallet((state) => state.isConnected);
  useEffect(() => console.log("isConnected"));
  return <div>Connected: {isConnected}</div>;
};

const ConnectingTo = () => {
  const wallet = useWallet("isConnectingTo");
  useEffect(() => console.log("isConnectingTo"));
  return <div>Connecting to: {wallet.isConnectingTo}</div>;
};

const Description = () => {
  const wallet = useWallet("description");
  useEffect(() => console.log("description"));
  return <div>Description: {wallet.description}</div>;
};

const Balance = () => {
  const balance = useWallet((state) => state.balance?.ada.toFixed(2));
  useEffect(() => console.log("balance"));
  return <div>Balance: {balance}</div>;
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
        <div className="flex flex-col gap-2">
          <Connected />
          <ConnectingTo />
          <Description />
          <Balance />
        </div>
      </div>
    </article>
  );
};

export const Extensions = () => {
  const extensions = useExtensionsDerived((state) => state.all);
  console.log("extensions");
  return (
    <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
      <div className="card-body text-center">
        Installed extensions:
        <ul>
          {extensions &&
            Array.from(extensions.values()).map((ext) => (
              <li key={ext.info.key}>{ext.info.displayName}</li>
            ))}
        </ul>
      </div>
    </article>
  );
};

export const App = () => {
  return (
    <ExampleContainer>
      <Extensions />
      {/* <Wallet /> */}
    </ExampleContainer>
  );
};
