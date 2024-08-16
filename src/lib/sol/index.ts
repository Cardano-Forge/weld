import { type SolStore, createSolStore } from "../main/stores/sol";

let store: SolStore | undefined = undefined;

export const sol = {
  get store() {
    if (!store) {
      store = createSolStore();
    }
    return store;
  },
};
