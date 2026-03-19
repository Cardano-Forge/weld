import { extname, relative, resolve } from "node:path";
import { glob } from "glob";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: Object.fromEntries(
        glob
          .sync("src/**/*.ts", { ignore: ["src/**/*.test.ts"] })
          .map((file) => [
            relative("src", file.slice(0, file.length - extname(file).length)),
            resolve(__dirname, file),
          ]),
      ),
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vite", "vite-plugin-dts"],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
    ssr: true,
  },
});
