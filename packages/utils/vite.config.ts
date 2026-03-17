import { extname, relative, resolve } from "node:path";
import { glob } from "glob";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      // Dynamically find all files in src/ as entry points
      entry: Object.fromEntries(
        glob
          .sync("src/**/*.ts", { ignore: ["src/*.test.ts"] })
          .map((file) => [
            relative("src", file.slice(0, file.length - extname(file).length)),
            resolve(__dirname, file),
          ]),
      ),
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        // Preserve the directory structure in dist/
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
