import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { globSync } from "node:fs";

const examples = Object.fromEntries(
	globSync("src/examples/*/index.html").map((file) => [
		file.replace("src/examples/", "").replace("/index.html", ""),
		fileURLToPath(new URL(file, import.meta.url)),
	]),
);

export default defineConfig({
	plugins: [react()],
	resolve: {
		preserveSymlinks: true,
		alias: [
			{
				find: "@",
				replacement: fileURLToPath(new URL("src", import.meta.url)),
			},
		],
	},
	build: {
		rollupOptions: {
			input: {
				main: fileURLToPath(new URL("index.html", import.meta.url)),
				...examples,
			},
		},
	},
});
