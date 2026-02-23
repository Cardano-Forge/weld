import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/lib.ts",
      name: "weld-plugin-hodei",
      formats: ["es"],
    },
  },
});
