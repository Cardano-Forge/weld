import { useWallet } from "@ada-anvil/weld/react";
import { ExampleContainer } from "@/commons/example-container";

export const App = () => {
  const wallet = useWallet();

  return (
    <ExampleContainer>
      <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
        <div className="card-body text-center">
          {!wallet.isConnected ? (
            <h2>Connect your wallet</h2>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => wallet.handler.signTx("YOUR_TX", true)}
            >
              Sign
            </button>
          )}
        </div>
      </article>
    </ExampleContainer>
  );
};
