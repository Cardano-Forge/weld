import { ExampleContainer } from "@/documentation/commons/example-container";
import { useWalletContext } from "@/lib/react/contexts/wallet.context";
import { SUPPORTED_WALLETS } from "@/lib/utils";
import { useEffect } from "react";

export const App = () => {
  const { wallet, connectWallet, connectWalletAsync } = useWalletContext();

  useEffect(() => {
    if (wallet.isConnected) {
      wallet.handler.initialize();
    }
  }, [wallet]);

  // @ts-ignore:next-line
  const handleConnectSync = (key: string) => {
    connectWallet(key, {
      onSuccess(wallet) {
        console.log("wallet", wallet);
      },
      onError(error) {
        console.log("error", error);
      },
    });
  };

  const handleConnectAsync = async (key: string) => {
    try {
      const wallet = await connectWalletAsync(key);
      console.log("wallet", wallet);
    } catch (error) {
      console.log("error", error);
    }
  };

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
                onClick={() => handleConnectAsync(key)}
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
