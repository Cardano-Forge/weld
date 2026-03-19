import { generateDts } from "@weld/vite-plugins/generate-dts";
import { writePackageJson } from "@weld/vite-plugins/write-package-json";
import { defineConfig } from "vite";

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
  plugins: [generateDts(), writePackageJson()],
});
