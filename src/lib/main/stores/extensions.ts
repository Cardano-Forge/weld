import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, createStoreFactory } from "@/internal/store";
import { setupAutoUpdate } from "@/internal/update";
import { type ExtensionsConfig, getUpdateConfig } from "../config";
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
};

export type ExtensionsStoreState = ExtensionsState & ExtensionsApi;
export type ExtensionsStore = Store<ExtensionsStoreState>;

export type CreateExtensionsStoreOpts = Partial<ExtensionsConfig> & {
  onUpdateError?(error: unknown): void;
};

export const createExtensionsStore = createStoreFactory<
  ExtensionsStoreState,
  [opts?: CreateExtensionsStoreOpts]
>((setState, getState, { onUpdateError, ...storeConfigOverrides } = {}) => {
  const lifecycle = new LifeCycleManager();

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
      onUpdateError?.(error);
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
          const updateConfig = getUpdateConfig("extensions", storeConfigOverrides);
          setupAutoUpdate(update, updateConfig, lifecycle);
        })
        .finally(() => {
          lifecycle.inFlight.remove(signal);
        });
    }
  };

  const __cleanup = () => {
    lifecycle.cleanup();
  };

  return {
    ...initialExtensionsState,
    update,
    __init,
    __cleanup,
  };
});
