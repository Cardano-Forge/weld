import { copyFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LibraryOptions, PluginOption } from "vite";
import dts from "vite-plugin-dts";

export function generateDtsEntryPoints(entryPoints: string[]): PluginOption {
  let hasGenerated = false;
  return {
    name: "generate-dts-entry-points",
    async writeBundle(opts) {
      if (hasGenerated) return;
      hasGenerated = true;
      await Promise.all(
        entryPoints.map((file) =>
          writeFile(`${opts.dir}/${file}.d.ts`, `export * from "./types/lib/${file}";`),
        ),
      );
    },
  };
}

export function copyPackageJson(): PluginOption {
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

export function getLibEntry(entryPoints: string[]) {
  return entryPoints.reduce(
    (acc, file) => {
      const ext = file.includes("react") ? "tsx" : "ts";
      acc[file] = resolve(__dirname, `src/lib/${file}/index.${ext}`);
      return acc;
    },
    {} as Extract<LibraryOptions["entry"], Record<string, unknown>>,
  );
}

export function generateDts() {
  return dts({ outputDir: "dist/types", exclude: ["documentation/**"] });
}

export const externalPackages = [
  "react",
  /^react\/.*/,
  "react-dom",
  /react-dom\/.*/,
  "@types/react",
  "@types/react-dom",
  "@solana/web3.js",
  "ethers",
];

export const pathAliases = {
  "@/documentation": resolve(__dirname, "documentation"),
  "@": resolve(__dirname, "src"),
};
