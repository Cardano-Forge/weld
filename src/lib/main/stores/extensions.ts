import { setupAutoUpdate } from "@/internal/auto-update";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";
import { weld } from "..";
import {
  type InstalledExtensions,
  getInstalledExtensions,
  newInstalledExtensions,
} from "../extensions";

export type ExtensionsProps = InstalledExtensions & {
  isLoading: boolean;
  isFetching: boolean;
};

export type ExtensionsApi = {
  update(): Promise<void>;
};

export type ExtensionsStoreState = ExtensionsProps & ExtensionsApi;

export type ExtensionsStore = Store<ExtensionsStoreState>;

type ExtendedExtensionsStoreState = ExtensionsStoreState & StoreSetupFunctions;

export const createExtensionsStore = createStoreFactory<
  ExtensionsStoreState,
  undefined,
  [] | [{ lifecycle?: LifeCycleManager }]
>((setState, getState, { lifecycle = new LifeCycleManager() } = {}) => {
  const handleUpdateError = (error: unknown) => {
    weld.config.getState().onUpdateError?.("extensions", error);
    weld.config.getState().wallet.onUpdateError?.(error);
  };

  const update: ExtensionsApi["update"] = async (signal?: InFlightSignal) => {
    if (weld.config.getState().debug) {
      console.log("[WELD] Extensions state update");
    }
    try {
      if (getState()?.isFetching || signal?.aborted) {
        return;
      }
      setState({ isFetching: true });
      const res = await getInstalledExtensions();
      if (signal?.aborted) {
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
  };

  const __init = () => {
    if (typeof window !== "undefined") {
      lifecycle.subscriptions.clearAll();
      const signal = lifecycle.inFlight.add();
      update()
        .then(() => {
          if (signal.aborted) {
            return;
          }
          setupAutoUpdate(update, lifecycle, weld.config, "extensions");
        })
        .finally(() => {
          lifecycle.inFlight.remove(signal);
        });
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
});
