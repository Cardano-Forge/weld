import type { UpdateConfig } from "@/lib/main/config";
import type { LifeCycleManager } from "./lifecycle";

export function setupAutoUpdate(
  update: () => unknown,
  config: UpdateConfig,
  lifecycle: LifeCycleManager,
) {
  if (config.updateInterval) {
    const pollInterval = setInterval(() => {
      update();
    }, config.updateInterval);
    lifecycle.subscriptions.add(() => {
      clearInterval(pollInterval);
    });
  }

  if (config.updateOnWindowFocus) {
    const listener = () => {
      update();
    };
    window.addEventListener("focus", listener);
    lifecycle.subscriptions.add(() => {
      window.removeEventListener("focus", listener);
    });
  }
}
