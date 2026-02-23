import type { WeldConfig } from "@/lib/main/stores/config";
import { getFailureReason } from "../utils/errors";

export async function initPlugins(config: Partial<WeldConfig>): Promise<void> {
  await Promise.all(
    config.plugins?.map(async (plugin) => {
      try {
        await plugin.initialize?.();
        if (config.debug) {
          console.info("[WELD] Initialization of", plugin.key, "plugin succeeded");
        }
      } catch (error) {
        if (config.debug) {
          console.warn(
            "[WELD] Initialization of",
            plugin.key,
            "plugin failed:",
            getFailureReason(error),
          );
        }
      }
    }) ?? [],
  );
}
