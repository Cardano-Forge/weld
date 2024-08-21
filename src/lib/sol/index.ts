import { type SolStore, createSolStore } from "./store";

let store: SolStore | undefined = undefined;

export const sol = {
  get store() {
    if (!store) {
      store = createSolStore();
    }
    return store;
  },
};
