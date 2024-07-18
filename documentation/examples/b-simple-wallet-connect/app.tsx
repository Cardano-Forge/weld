import { ExampleContainer } from "@/documentation/commons/example-container";
import { useWalletStore } from "@/lib/react/wallet";
import { SUPPORTED_WALLETS } from "@/lib/utils";

export const App = () => {
  const wallet = useWalletStore();
  return (
    <ExampleContainer>
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
    </ExampleContainer>
  );
};
