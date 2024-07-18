import { useWalletPick } from "@/lib/react";
import { useDialogContext } from "../hooks/dialog.context";

const Icon = ({ icon }: { icon: string | null }) => {
  if (!icon) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
        />
        <title>Wallet</title>
      </svg>
    );
  }

  return <img src={icon} alt="Wallet icon" className="w-6 h-6" style={{ objectFit: "cover" }} />;
};

const DialogTrigger = () => {
  const wallet = useWalletPick("isConnected", "icon");
  const { open } = useDialogContext();
  return (
    <button type="button" className="btn btn-sm ml-auto" onClick={open}>
      <Icon icon={wallet.icon ?? null} />
      <div>{wallet.isConnected ? "Switch" : "Connect"}</div>
    </button>
  );
};

export default DialogTrigger;
