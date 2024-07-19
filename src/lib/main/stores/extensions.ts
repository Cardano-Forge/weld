import { type Store, createStore } from "@/internal/store";
import { getFailureReason } from "@/lib/utils";
import {
  type InstalledExtensions,
  getInstalledExtensions,
  newInstalledExtensions,
} from "../extensions";

export type ExtensionsState = InstalledExtensions & {
  isLoading: boolean;
  isFetching: boolean;
  error: string | undefined;
};

const initialExtensionsState: ExtensionsState = {
  ...newInstalledExtensions(),
  isLoading: true,
  isFetching: false,
  error: undefined,
};

export type ExtensionsApi = {
  update(): void;
};

export type ExtensionsStore = Store<ExtensionsState & ExtensionsApi>;

export function createExtensionsStore(): Store<ExtensionsState & ExtensionsApi> {
  return createStore<ExtensionsState & ExtensionsApi>((setState, getState) => {
    const update = () => {
      if (getState()?.isFetching) {
        return;
      }
      setState({ isFetching: true });
      getInstalledExtensions()
        .then(({ map, arr }) => {
          setState({
            map,
            arr,
            isLoading: false,
            isFetching: false,
            error: undefined,
          });
        })
        .catch((error) => {
          const message = getFailureReason(error) ?? "Could not retrieve user wallets";
          setState({
            ...newInstalledExtensions(),
            isLoading: false,
            isFetching: false,
            error: message,
          });
        });
    };

    const isServer = typeof window === "undefined";
    if (!isServer) {
      update();
    }

    return {
      ...initialExtensionsState,
      update,
    };
  });
}
