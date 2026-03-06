import { copyFile, writeFile } from "node:fs/promises";
import dts from "unplugin-dts/vite";
import { defineConfig, type PluginOption } from "vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  build: {
    rollupOptions: {
      external: [/@ada-anvil\/weld/, /@ada-anvil\/hodei-client/],
    },
    lib: {
      entry: "src/lib.ts",
      name: "weld-plugin-hodei",
      fileName: "lib",
      formats: ["es"],
    },
  },
  plugins: [
    dts({
      bundleTypes: true,
    }),
    copyPackageJson(),
  ],
});

function copyPackageJson(): PluginOption {
  let hasGenerated = false;
  return {
    name: "copy-package-json",
    async writeBundle() {
      if (hasGenerated) {
        return;
      }
      hasGenerated = true;
      await Promise.all([
        writeFile(
          "dist/package.json",
          JSON.stringify(
            {
              ...pkg,
              files: ["**"],
              type: "module",
              main: "./lib.js",
              module: "./lib.js",
              types: "./lib.d.ts",
              exports: {
                ".": {
                  types: "./lib.d.ts",
                  import: "./lib.js",
                },
              },
            },
            null,
            2,
          ),
        ),
        copyFile("./README.md", "dist/README.md"),
        copyFile("./LICENSE", "dist/LICENSE"),
      ]);
    },
  };
}
