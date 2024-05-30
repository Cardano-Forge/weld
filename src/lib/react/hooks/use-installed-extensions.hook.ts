import { type InstalledExtensions, getInstalledExtensions } from "@/lib/main";
import { useCallback, useEffect } from "react";
import { getFailureReason } from "../../utils";
import { type QueryState, useQueryReducer } from "../query-reducer";

export type UseInstalledExtensionsReturnType = {
  installedExtensions: QueryState<InstalledExtensions>;
  updateInstalledExtensions: () => Promise<InstalledExtensions | undefined>;
};

export function useInstalledExtensions() {
  const [installedExtensions, dispatch] = useQueryReducer<InstalledExtensions>();

  const updateInstalledExtensions = useCallback(async () => {
    try {
      dispatch({ type: "startRefresh" });
      const data = await getInstalledExtensions();
      dispatch({ type: "setData", payload: data });
      return data;
    } catch (error) {
      const message = getFailureReason(error) ?? "Could not retrieve user wallets";
      dispatch({ type: "setError", payload: message });
    }
  }, [dispatch]);

  useEffect(() => {
    updateInstalledExtensions();
  }, [updateInstalledExtensions]);

  return { installedExtensions, updateInstalledExtensions };
}
