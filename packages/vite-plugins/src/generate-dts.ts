import type { PluginOption } from "vite";
import dts from "vite-plugin-dts";

export function generateDts(): PluginOption {
	return dts({ outDir: "dist/types" });
}
