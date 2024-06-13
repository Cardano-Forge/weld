import { copyFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { type LibraryOptions, type PluginOption, defineConfig } from "vite";
import dts from "vite-plugin-dts";
import * as pkg from "./package.json";

const entryPoints = Object.values(pkg.exports)
  .map((exp) => exp.import.replace("./", "").split(".")[0])
  .filter(Boolean);

function generateDtsEntryPoints(): PluginOption {
  let hasGenerated = false;
  return {
    name: "generate-dts-entry-points",
    async writeBundle(opts) {
      if (hasGenerated) return;
      hasGenerated = true;
      await Promise.all(
        entryPoints.map((file) =>
          writeFile(
            `${opts.dir}/${file}.d.ts`,
            `export * from "./types/lib/${file}";`
          )
        )
      );
    },
  };
}

function copyPackageJson(): PluginOption {
  let hasGenerated = false;
  return {
    name: "copy-package-json",
    async writeBundle() {
      if (hasGenerated) return;
      hasGenerated = true;
      await copyFile("./package.json", "dist/package.json");
      await copyFile("./README.md", "dist/README.md");
      await copyFile("./LICENSE", "dist/LICENSE");
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@/documentation": resolve(__dirname, "documentation"),
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: entryPoints.reduce((acc, file) => {
        acc[file] = resolve(__dirname, `src/lib/${file}/index.ts`);
        return acc;
      }, {} as Extract<LibraryOptions["entry"], Record<string, unknown>>),
    },
    rollupOptions: {
      external: ["react", "react-dom", "@types/react", "@types/react-dom"],
    },
  },
  plugins: [
    dts({ outDir: "dist/types", exclude: ["documentation/**"] }),
    generateDtsEntryPoints(),
    copyPackageJson(),
  ],
});
