import { type Store, hasLifeCycleMethods, hasPersistMethod } from "@/internal/store";
import { initialize } from "./initialize";

/**
 * This function must be called as soon as possible
 * _When using weld with React, setup is performed through the WeldProvider, so no need to call it manually_.
 */
export function setupStores(...stores: Store[]) {
  window.addEventListener("load", () => {
    initialize();
  });
  for (const store of stores) {
    window.addEventListener("load", () => {
      const state = store.getState();
      if (hasPersistMethod(state)) {
        state.__persist?.();
      }
      if (hasLifeCycleMethods(state)) {
        state.init?.();
      }
    });
    window.addEventListener("unload", () => {
      const state = store.getState();
      if (hasLifeCycleMethods(state)) {
        state.cleanup?.();
      }
    });
  }
}
