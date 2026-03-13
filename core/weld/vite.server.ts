import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import {
  externalPackages,
  generateDts,
  generateDtsEntryPoints,
  getLibEntry,
  pathAliases,
} from "./build.utils";

const entryPoints = ["server"];

export default defineConfig({
  resolve: { alias: pathAliases },
  build: {
    emptyOutDir: false,
    lib: { name: "server", entry: getLibEntry(entryPoints) },
    rollupOptions: { external: externalPackages },
  },
  plugins: [generateDts(), generateDtsEntryPoints(entryPoints), nodePolyfills()],
});
