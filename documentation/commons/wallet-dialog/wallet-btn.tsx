import { useWallet } from "@/lib/react";
import type { WalletInfo } from "@/lib/utils";
import clsx from "clsx";

export const WalletBtn = ({
  info,
  onClick,
  className,
  installed = true,
}: {
  info: WalletInfo;
  onClick(key: string): void | Promise<void>;
  className?: string;
  installed?: boolean;
}) => {
  const wallet = useWallet((s) => ({
    isConnectingTo: s.isConnectingTo,
    isLoading: info.key === s.isConnectingTo,
  }));

  if (!installed && info.website) {
    return (
      <button
        type="button"
        onClick={() => window.open(info.website, "_blank", "noopener noreferrer")}
        disabled={wallet.isLoading}
        className={clsx("btn py-4 h-full", className)}
      >
        <div className="flex flex-col items-center">
          <img alt={info.key} src={info.icon} className="w-6 h-6 object-contain" />
          <div className="mt-4">{info.displayName}</div>
        </div>
      </button>
    );
  }

  if (!installed) {
    return (
      <button type="button" disabled className={clsx("btn py-4 h-full", className)}>
        <div className="flex flex-col items-center">
          <img alt={info.key} src={info.icon} className="w-6 h-6 mb-4 object-contain" />
          <div>{info.displayName}</div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-busy={wallet.isLoading}
      disabled={!!wallet.isConnectingTo || wallet.isLoading}
      onClick={() => onClick(info.key)}
      key={info.key}
      className={clsx("btn py-4 h-full", className)}
    >
      {!wallet.isLoading && (
        <div className="flex flex-col items-center">
          <img alt={info.key} src={info.icon} className="w-6 h-6 object-contain" />
          <div className="mt-4">{info.displayName}</div>
        </div>
      )}
    </button>
  );
};
