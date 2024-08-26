import { weld } from "@/lib/main";

declare global {
  interface Window {
    Weld: typeof weld;
  }
}

window.Weld = weld;
