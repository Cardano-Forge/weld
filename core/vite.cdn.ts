import { defineConfig } from "vite";
import { pathAliases } from "./build.utils";

export default defineConfig({
  resolve: { alias: pathAliases },
  build: {
    minify: true,
    emptyOutDir: false,
    lib: {
      formats: ["iife"],
      name: "cdn",
      entry: "/src/lib/cdn/index.ts",
      fileName: () => "cdn.min.js",
    },
  },
});
