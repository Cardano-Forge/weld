import { copyFile, writeFile } from "node:fs/promises";
import dts from "unplugin-dts/vite";
import { defineConfig, type PluginOption } from "vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  build: {
    rollupOptions: {
      external: [/@ada-anvil\/weld/, "hodei-client"],
    },
    lib: {
      entry: "src/lib.ts",
      name: "weld-plugin-hodei",
      fileName: "lib",
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
              main: "./lib.umd.cjs",
              module: "./lib.js",
              types: "./lib.d.ts",
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
