import { type Store, createStoreFactory } from "@/internal/store";
import { type WeldConfig, defaults } from "../config";

export type ConfigApi = {
  update(values: Partial<WeldConfig>): void;
};

export type ConfigStoreState = WeldConfig & ConfigApi;
export type ConfigStore = Store<ConfigStoreState>;

export const createConfigStore = createStoreFactory<ConfigStoreState>((setState, getState) => {
  const update: ConfigApi["update"] = ({ wallet, extensions, ...common }) => {
    const newState = { ...getState() };
    if (wallet) {
      Object.assign(newState.wallet, wallet);
    }
    if (extensions) {
      Object.assign(newState.extensions, extensions);
    }
    Object.assign(newState, common);
    setState(newState);
  };

  return {
    ...defaults,
    update,
  };
});
