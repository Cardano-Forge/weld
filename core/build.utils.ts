import { readFileSync } from "node:fs";
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
          writeFile(`${opts.dir}/${file}.d.ts`, `export * from "./types/src/lib/${file}";`),
        ),
      );
    },
  };
}

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
  return dts({ outDir: "dist/types" });
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
  "@": resolve(__dirname, "src"),
};
