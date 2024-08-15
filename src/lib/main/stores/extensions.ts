import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";
import { setupAutoUpdate } from "@/internal/update";
import { defaults, getUpdateConfig } from "../config";
import {
  type InstalledExtensions,
  getInstalledExtensions,
  newInstalledExtensions,
} from "../extensions";

export type ExtensionsState = InstalledExtensions & {
  isLoading: boolean;
  isFetching: boolean;
};

const initialExtensionsState: ExtensionsState = {
  ...newInstalledExtensions(),
  isLoading: true,
  isFetching: false,
};

export type ExtensionsApi = {
  update(): Promise<void>;
} & StoreLifeCycleMethods;

export type ExtensionsStoreState = ExtensionsState & ExtensionsApi;
export type ExtensionsStore = Store<ExtensionsStoreState>;

export const createExtensionsStore = createStoreFactory<ExtensionsStoreState>(
  (setState, getState) => {
    const lifecycle = new LifeCycleManager();

    const handleUpdateError = (error: unknown) => {
      defaults.onUpdateError?.("extensions", error);
      defaults.wallet.onUpdateError?.(error);
    };

    const update: ExtensionsApi["update"] = async (signal?: InFlightSignal) => {
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

    const init = () => {
      if (typeof window !== "undefined") {
        lifecycle.subscriptions.clearAll();
        const signal = lifecycle.inFlight.add();
        update()
          .then(() => {
            if (signal.aborted) {
              return;
            }
            const updateConfig = getUpdateConfig("extensions");
            setupAutoUpdate(update, updateConfig, lifecycle);
          })
          .finally(() => {
            lifecycle.inFlight.remove(signal);
          });
      }
    };

    const cleanup = () => {
      lifecycle.cleanup();
    };

    return {
      ...initialExtensionsState,
      update,
      init,
      cleanup,
    };
  },
);
