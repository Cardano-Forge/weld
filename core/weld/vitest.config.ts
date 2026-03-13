import { defineConfig } from "vitest/config";
import { pathAliases } from "./build.utils";

export default defineConfig({
  resolve: { alias: pathAliases },
  test: { environment: "jsdom" },
});
