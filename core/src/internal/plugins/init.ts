import { getFailureReason } from "@weld/utils/errors";
import type { WeldInstance } from "@/lib/main";

export async function initPlugins(weld: WeldInstance): Promise<void> {
	await Promise.all(
		weld.config.plugins?.map(async (plugin) => {
			try {
				if (weld.config.debug) {
					console.info("[WELD] Initializing", plugin.key, "plugin...");
				}
				await plugin.initialize?.(weld);
				if (weld.config.debug) {
					console.info(
						"[WELD] Initialization of",
						plugin.key,
						"plugin succeeded",
					);
				}
			} catch (error) {
				if (weld.config.debug) {
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
