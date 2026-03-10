import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [/@ada-anvil\/weld/],
      output: {
        globals: {
          "@ada-anvil/weld/core": "WeldCore",
        },
      },
    },
    minify: true,
    emptyOutDir: false,
    lib: {
      entry: "src/lib.ts",
      name: "HodeiPlugin",
      fileName: () => "cdn.min.js",
      formats: ["iife"],
    },
  },
});
