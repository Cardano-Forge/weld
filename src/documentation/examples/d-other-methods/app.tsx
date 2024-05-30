import { ExampleContainer } from "@/documentation/commons/example-container";
import { useWalletContext } from "@/lib/react/contexts/wallet.context";
import { useEffect } from "react";

export const App = () => {
  const { wallet } = useWalletContext();

  useEffect(() => {
    if (wallet.isConnected) {
      wallet.handler.initialize();
    }
  }, [wallet]);

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
