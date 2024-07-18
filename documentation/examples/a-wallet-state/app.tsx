import { ExampleContainer } from "@/documentation/commons/example-container";
import { useWallet } from "@/lib/react";
import { useEffect } from "react";

export const App = () => {
  const wallet = useWallet();

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
            <>
              <div>Connected to</div>
              <div className="py-2 px-4 text-xs bg-slate-100 rounded-md break-words">
                {wallet.handler.info.displayName}
              </div>
              <div>Stake address:</div>
              <div className="py-2 px-4 text-xs bg-slate-100 rounded-md break-words">
                {wallet.rewardAddress}
              </div>
              <div>Change address:</div>
              <div className="py-2 px-4 text-xs bg-slate-100 rounded-md break-words">
                {wallet.changeAddress}
              </div>
              <div>Network:</div>
              <div className="py-2 px-4 text-xs bg-slate-100 rounded-md break-words">
                {wallet.networkId}
              </div>
              <div>Lovelace:</div>
              <div className="py-2 px-4 text-xs bg-slate-100 rounded-md break-words">
                {wallet.balance.ada.toFixed(2)}
              </div>
            </>
          )}
        </div>
      </article>
    </ExampleContainer>
  );
};
