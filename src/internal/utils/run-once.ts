import { deferredPromise } from "@/internal/utils/deferred-promise";

type State = { status: "idle" | "initialized" } | { status: "loading"; promise: Promise<void> };

export function runOnce(fn: () => Promise<boolean> | boolean): () => Promise<void> {
  let state: State = { status: "idle" };
  return async () => {
    if (state.status === "initialized") {
      return;
    }
    if (state.status === "loading") {
      // Already initializing, return the existing promise
      return state.promise;
    }
    const { promise, resolve } = deferredPromise<void>();
    state = { status: "loading", promise };
    const res = await fn();
    state = { status: res ? "initialized" : "idle" };
    resolve();
    return promise;
  };
}
