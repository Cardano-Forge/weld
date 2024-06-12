import { ExampleContainer } from "@/documentation/commons/example-container";
import { useWalletContext } from "@/lib/react/contexts/wallet.context";
import { SUPPORTED_WALLETS } from "@/lib/utils";
import { useEffect } from "react";

export const App = () => {
  const { wallet, connectWallet } = useWalletContext();

  useEffect(() => {
    if (wallet.isConnected) {
      wallet.handler.initialize();
    }
  }, [wallet]);

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
                onClick={() => connectWallet(key)}
              >
                {displayName}
              </button>
            ))}
          </div>
        </div>
      </article>
    </ExampleContainer>
  );
};
