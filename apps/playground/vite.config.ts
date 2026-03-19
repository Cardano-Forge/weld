import { globSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const examples = Object.fromEntries(
	globSync("src/examples/*/index.html").map((file) => [
		file.replace("src/examples/", "").replace("/index.html", ""),
		fileURLToPath(new URL(file, import.meta.url)),
	]),
);

export default defineConfig({
	root: "src",
	plugins: [react()],
	server: {
		fs: {
			allow: [fileURLToPath(new URL("../..", import.meta.url))],
		},
	},
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
		outDir: "./dist",
		rollupOptions: {
			input: {
				main: fileURLToPath(new URL("src/index.html", import.meta.url)),
				...examples,
			},
		},
	},
});
