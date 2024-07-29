import type { ReactNode } from "react";
import { AnvilIcon } from "../anvil-logo";
import { DialogProvider } from "../hooks/dialog.context";
import Logo from "../logo";
import WalletDialog from "../wallet-dialog";
import DialogTrigger from "../wallet-dialog/dialog-trigger";

export const ExampleContainer = ({ children }: { children: ReactNode }) => {
  return (
    <DialogProvider>
      <header>
        <div className="container py-4 flex items-center">
          <a href="/">
            <Logo type="logo-h" />
          </a>
          <DialogTrigger />
        </div>
      </header>
      <section className="flex-1">
        <div className="container">{children}</div>
      </section>
      <footer>
        <div className="container py-2 flex justify-center">
          <div className="flex items-center gap-1 text-xs font-semibold h-9">
            <span>Powered by</span>
            <i>
              <AnvilIcon />
            </i>
          </div>
        </div>
      </footer>
      <WalletDialog />
    </DialogProvider>
  );
};
