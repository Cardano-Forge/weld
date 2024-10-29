import { setupAutoUpdate } from "@/internal/auto-update";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";
import {
  type ExtensionCache,
  type InstalledExtensions,
  getInstalledExtensions as defaultGetInstalledExtensions,
  newExtensionCache,
  newInstalledExtensions,
} from "@/lib/main/extensions";
import { weld } from "..";
import type { ConfigStore } from "./config";

export type ExtensionsProps = InstalledExtensions & {
  isLoading: boolean;
  isFetching: boolean;
};

export type ExtensionsApi = {
  update(): Promise<void>;
};

export type ExtensionsStoreState = ExtensionsProps & ExtensionsApi;

export type ExtensionsStore = Store<ExtensionsStoreState> & ExtensionsStoreState;

type ExtendedExtensionsStoreState = ExtensionsStoreState & StoreSetupFunctions;

export const createExtensionsStore = createStoreFactory<
  ExtensionsStoreState,
  undefined,
  | []
  | [
      {
        config?: ConfigStore;
        lifecycle?: LifeCycleManager;
        cache?: ExtensionCache;
        getInstalledExtensions?: typeof defaultGetInstalledExtensions;
      },
    ]
>(
  (
    setState,
    _getState,
    {
      config = weld.config,
      lifecycle = new LifeCycleManager(),
      cache = newExtensionCache(),
      getInstalledExtensions = defaultGetInstalledExtensions,
    } = {},
  ) => {
    const handleUpdateError = (error: unknown) => {
      config.onUpdateError?.("extensions", error);
      config.extensions.onUpdateError?.(error);
    };

    const update = (async (signal?: InFlightSignal, stop?: () => void) => {
      if (config.debug) {
        console.log("[WELD] Extensions state update");
      }
      try {
        if (signal?.aborted) {
          stop?.();
          return;
        }
        setState({ isFetching: true });
        const res = await getInstalledExtensions({ cache });
        if (signal?.aborted) {
          stop?.();
          return;
        }
        setState({
          ...res,
          isLoading: false,
          isFetching: false,
        });
      } catch (error) {
        handleUpdateError(error);
        setState({
          isLoading: false,
          isFetching: false,
        });
      }
    }) satisfies ExtensionsApi["update"];

    const __init = async () => {
      if (typeof window === "undefined") {
        return;
      }
      lifecycle.subscriptions.clearAll();
      const signal = lifecycle.inFlight.add();
      try {
        await update(signal);
        if (signal.aborted) {
          return;
        }
        setupAutoUpdate((stop) => update(signal, stop), lifecycle, config, "extensions");
      } finally {
        lifecycle.inFlight.remove(signal);
      }
    };

    const __cleanup = () => {
      lifecycle.cleanup();
    };

    const initialState: ExtendedExtensionsStoreState = {
      ...newInstalledExtensions(),
      isLoading: true,
      isFetching: false,
      update,
      __init,
      __cleanup,
    };

    return initialState as ExtensionsStoreState;
  },
);
