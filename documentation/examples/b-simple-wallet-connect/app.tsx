import { ExampleContainer } from "@/documentation/commons/example-container";
import { useExtensions } from "@/lib/react";
import { useWallet } from "@/lib/react/wallet";
import { SUPPORTED_WALLETS } from "@/lib/utils";

export const Wallet = () => {
  const wallet = useWallet();
  return (
    <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
      <div className="card-body text-center">
        <div className="flex flex-wrap gap-4">
          {SUPPORTED_WALLETS.map(({ key, displayName }) => (
            <button
              key={key}
              type="button"
              className="btn btn-primary"
              onClick={() => wallet.connect(key)}
            >
              {displayName}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div>Connected: {wallet.isConnected}</div>
          <div>Connecting to: {wallet.isConnectingTo ?? "-"}</div>
          <div>Connected to: {wallet.displayName ?? "-"}</div>
        </div>
      </div>
    </article>
  );
};

export const Extensions = () => {
  const extensions = useExtensions();
  return (
    <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
      <div className="card-body text-center">
        Installed extensions:
        <ul>
          {extensions.all &&
            Array.from(extensions.all.values()).map((ext) => (
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
      <Wallet />
    </ExampleContainer>
  );
};
