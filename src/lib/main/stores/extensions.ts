import { type Store, createStore } from "@/internal/store";
import { getFailureReason } from "@/lib/utils";
import { type InstalledExtensions, getInstalledExtensions } from "../extensions";

export type ExtensionsState = {
  [TKey in keyof InstalledExtensions]: InstalledExtensions[TKey] | undefined;
} & {
  isLoading: boolean;
  isFetching: boolean;
  error: string | undefined;
};

const initialExtensionsState: ExtensionsState = {
  supported: undefined,
  unsupported: undefined,
  all: undefined,
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
        .then(({ supported, unsupported, all }) => {
          setState({
            supported,
            unsupported,
            all,
            isLoading: false,
            isFetching: false,
            error: undefined,
          });
        })
        .catch((error) => {
          const message = getFailureReason(error) ?? "Could not retrieve user wallets";
          setState({
            supported: undefined,
            unsupported: undefined,
            all: undefined,
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
