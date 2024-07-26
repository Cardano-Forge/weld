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

export type ExtensionsStoreState = ExtensionsState & ExtensionsApi;
export type ExtensionsStore = Store<ExtensionsStoreState>;

export function createExtensionsStore(): ExtensionsStore {
  return createStore<ExtensionsStoreState>((setState, getState) => {
    const update = () => {
      if (getState()?.isFetching) {
        return;
      }
      setState({ isFetching: true });
      getInstalledExtensions()
        .then((res) => {
          setState({
            ...res,
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

    const __init = () => {
      if (typeof window !== "undefined") {
        update();
      }
    };

    return {
      ...initialExtensionsState,
      update,
      __init,
    };
  });
}
