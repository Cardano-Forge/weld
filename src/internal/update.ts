import { type StoreConfig, type UpdateConfig, weld } from "@/lib/main";
import type { LifeCycleManager } from "./lifecycle";

export function setupAutoUpdate(
  update: () => unknown,
  lifecycle: LifeCycleManager,
  store?: keyof StoreConfig,
  overrides?: Partial<UpdateConfig>,
) {
  let pollSub: (() => void) | undefined = undefined;
  lifecycle.subscriptions.add(
    weld.config.subscribeWithSelector(
      (s) => {
        if (typeof overrides?.updateInterval !== "undefined") {
          return overrides.updateInterval;
        }
        if (store) {
          const storeConfig = s[store];
          if (typeof storeConfig.updateInterval !== "undefined") {
            return storeConfig.updateInterval;
          }
        }
        return s.updateInterval;
      },
      (updateInterval) => {
        console.log("update interval for", store);
        if (pollSub) {
          pollSub();
        }
        if (!updateInterval) {
          return;
        }
        const pollInterval = setInterval(() => {
          update();
        }, updateInterval);
        pollSub = lifecycle.subscriptions.add(() => {
          clearInterval(pollInterval);
        });
      },
      { fireImmediately: true },
    ),
  );

  let windowFocusSub: (() => void) | undefined = undefined;
  lifecycle.subscriptions.add(
    weld.config.subscribeWithSelector(
      (s) => {
        if (typeof overrides?.updateOnWindowFocus !== "undefined") {
          return overrides.updateOnWindowFocus;
        }
        if (store) {
          const storeConfig = s[store];
          if (typeof storeConfig.updateOnWindowFocus !== "undefined") {
            return storeConfig.updateOnWindowFocus;
          }
        }
        return s.updateOnWindowFocus;
      },
      (updateOnWindowFocus) => {
        console.log("update window focus for", store);
        if (windowFocusSub) {
          windowFocusSub();
        }
        if (!updateOnWindowFocus) {
          return;
        }
        window.addEventListener("focus", update);
        windowFocusSub = lifecycle.subscriptions.add(() => {
          window.removeEventListener("focus", update);
        });
      },
      { fireImmediately: true },
    ),
  );
}
