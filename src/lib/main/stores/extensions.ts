import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import {
  type Store,
  type StoreLifeCycleMethods,
  type StoreUpdateErrorMethods,
  createStoreFactory,
} from "@/internal/store";
import { setupAutoUpdate } from "@/internal/update";
import { getUpdateConfig } from "../config";
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
} & StoreLifeCycleMethods &
  StoreUpdateErrorMethods;

export type ExtensionsStoreState = ExtensionsState & ExtensionsApi;
export type ExtensionsStore = Store<ExtensionsStoreState>;

export const createExtensionsStore = createStoreFactory<ExtensionsStoreState>(
  (setState, getState) => {
    const lifecycle = new LifeCycleManager();
    const updateErrorHandlers = new Set<(error: unknown) => void>();

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
        for (const handler of updateErrorHandlers) {
          handler(error);
        }
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

    const addUpdateErrorHandler = (handler: (error: unknown) => void) => {
      updateErrorHandlers.add(handler);
    };

    const removeUpdateErrorHandler = (handler: (error: unknown) => void) => {
      updateErrorHandlers.delete(handler);
    };

    return {
      ...initialExtensionsState,
      update,
      init,
      cleanup,
      addUpdateErrorHandler,
      removeUpdateErrorHandler,
    };
  },
);
