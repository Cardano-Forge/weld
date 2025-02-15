import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import {
  copyPackageJson,
  externalPackages,
  generateDts,
  generateDtsEntryPoints,
  getLibEntry,
  pathAliases,
} from "./build.utils";
import * as pkg from "./package.json";

const entryPoints = Object.values(pkg.exports)
  .map((exp) => exp.import.replace("./", "").split(".")[0])
  .filter(Boolean)
  .filter((name) => name !== "server");

export default defineConfig({
  resolve: { alias: pathAliases },
  build: {
    lib: { name: "client", entry: getLibEntry(entryPoints) },
    rollupOptions: {
      external: externalPackages,
      output: { banner: () => '"use client";' },
    },
  },
  plugins: [generateDts(), generateDtsEntryPoints(entryPoints), copyPackageJson(), nodePolyfills()],
});
