import { readFileSync } from "node:fs";
import { copyFile, writeFile } from "node:fs/promises";
import dts from "unplugin-dts/vite";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [/@ada-anvil\/weld/, /@ada-anvil\/hodei-client/],
    },
    lib: {
      entry: "src/lib.ts",
      name: "weld-plugin-hodei",
      fileName: "lib",
      formats: ["es", "cjs"],
    },
  },
  plugins: [
    dts({
      bundleTypes: true,
    }),
    writePackageJson(),
  ],
});

// biome-ignore lint/suspicious/noExplicitAny: no need to declare type for package.json content
function stripDist(pkg: any) {
  // Strip ./dist/ prefix from all fields
  pkg.main = pkg.main.replace("./dist/", "./");
  pkg.module = pkg.module.replace("./dist/", "./");
  pkg.types = pkg.types.replace("./dist/", "./");

  for (const key of Object.keys(pkg.exports)) {
    for (const condition of Object.keys(pkg.exports[key])) {
      pkg.exports[key][condition] = pkg.exports[key][condition].replace("./dist/", "./");
    }
  }

  delete pkg.scripts;
  delete pkg.devDependencies;
  return JSON.stringify(pkg, null, 2);
}

export function writePackageJson(): PluginOption {
  let hasGenerated = false;
  return {
    name: "write-package-json",
    async writeBundle() {
      if (!process.env.PUBLISH) {
        return;
      }
      if (hasGenerated) return;
      hasGenerated = true;
      await writeFile(
        "dist/package.json",
        stripDist(JSON.parse(readFileSync("./package.json", "utf-8"))),
      );
      await copyFile("./README.md", "dist/README.md");
      await copyFile("./LICENSE", "dist/LICENSE");
    },
  };
}
