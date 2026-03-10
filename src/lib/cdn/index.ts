import * as core from "@/lib/core";
import { weld } from "@/lib/main";
import * as plugins from "@/lib/plugins";

declare global {
  interface Window {
    Weld: typeof weld;
    WeldCore: typeof core;
    WeldPlugins: typeof plugins;
  }
}

window.Weld = weld;
window.WeldCore = core;
window.WeldPlugins = plugins;
