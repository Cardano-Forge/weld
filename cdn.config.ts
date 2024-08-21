import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@/documentation": resolve(__dirname, "documentation"),
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    minify: false,
    emptyOutDir: false,
    lib: {
      formats: ["iife"],
      name: "cdn",
      entry: "/src/lib/cdn/index.ts",
    },
  },
});