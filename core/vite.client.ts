import { generateDts } from "@weld/vite-plugins/generate-dts";
import { writePackageJson } from "@weld/vite-plugins/write-package-json";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { externalPackages, generateDtsEntryPoints, getLibEntry, pathAliases } from "./build.utils";

import * as pkg from "./package.json";

const entryPoints = Object.values(pkg.exports)
  .map((exp) => exp.import.replace("./dist/", "").split(".")[0])
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
  plugins: [
    generateDts(),
    generateDtsEntryPoints(entryPoints),
    writePackageJson(),
    nodePolyfills(),
  ],
});
