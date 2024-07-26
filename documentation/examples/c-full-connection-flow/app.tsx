import { ExampleContainer } from "@/documentation/commons/example-container";
import { useWallet } from "@/lib/react";

const WalletInfoLine = ({
  prefix,
  content,
  className,
}: {
  prefix: number;
  content: string;
  className?: string;
}) => (
  <pre data-prefix={prefix} className={className}>
    <code>{content}</code>
  </pre>
);

const MockupContent = () => {
  const wallet = useWallet();

  if (!wallet.isConnected) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Using index as a key here is not dangerous
          <WalletInfoLine key={index} prefix={index + 1} content="" />
        ))}
        <WalletInfoLine prefix={5} content="Waiting..." className="text-warning" />
      </>
    );
  }

  const walletData = [
    { key: "Reward", value: wallet.rewardAddress },
    { key: "Change", value: wallet.changeAddress },
    { key: "Network", value: wallet.networkId },
    {
      key: "Wallet",
      value: wallet.handler.info.displayName,
    },
    {
      key: "Balance",
      value: `${Math.floor(wallet.balanceAda)} ADA`,
    },
  ];

  return (
    <>
      {walletData.map((data, index) => (
        <WalletInfoLine key={data.key} prefix={index + 1} content={`${data.key}: ${data.value}`} />
      ))}
    </>
  );
};

export function App() {
  return (
    <ExampleContainer>
      <article className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2">Wallet State and Events</h2>
          <div className="grid md:grid-cols-2 md:gap-8">
            <div>
              <p className="text-sm">
                The wallet state includes the data that are usually displayed on the wallet
                connection component of a website, like a dropdown or a modal trigger. This data
                automatically updates in response to wallet events.
              </p>
              <h3 className="mt-2">Steps to test:</h3>
              <ul>
                <li className="ml-4 mt-2">
                  <h4>Connect a wallet</h4>
                  <div className="text-xs">Initiate a connection to view your wallet data</div>
                </li>
                <li className="ml-4 mt-2">
                  <h4>Switch the network</h4>
                  <div className="text-xs">
                    The network, addresses, and balance should automatically update.
                  </div>
                </li>
                <li className="ml-4 mt-2">
                  <h4>Reconnect with another dApp</h4>
                  <div className="text-xs">
                    You should observe that all relevant data updates dynamically with the new
                    connection.
                  </div>
                </li>
                <li className="ml-4 mt-2">
                  <h4>Bonus: Transfert ADA to your connected walle</h4>
                  <div className="text-xs">
                    Upon reception, you should see your balance updating
                  </div>
                </li>
              </ul>
            </div>
            <div className="mockup-code mb-auto">
              <MockupContent />
            </div>
          </div>
        </div>
      </article>
    </ExampleContainer>
  );
}
