import type { ReactNode } from "react";
import { AnvilIcon } from "../anvil-logo";
import Logo from "../logo";

export const ExampleContainer = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <header>
        <div className="container py-4 flex items-center">
          <a href="/">
            <Logo type="logo-h" />
          </a>
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
    </>
  );
};
