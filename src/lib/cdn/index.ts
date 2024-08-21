import { setupStores, weld } from "@/lib/main";

declare global {
  interface Window {
    Weld: typeof weld & {
      setupStores: typeof setupStores;
    };
  }
}

window.Weld = weld as typeof window.Weld;

Object.assign(window.Weld, { setupStores });
