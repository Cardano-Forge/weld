/**
 * publish.mjs
 *
 * Called by the Changesets action (via the `publish` option in release.yml)
 * once per package that needs publishing. Changesets sets the working
 * directory to the package root before calling this script.
 *
 * Sequence per package:
 *   1. npm run check   — tsc --noEmit (type safety gate)
 *   2. npm run test    — vitest run (correctness gate)
 *   3. npm run publish — PUBLISH=true build, which runs the regular build
 *                        plus the write-package-json vite plugin that copies
 *                        package.json, README.md and LICENSE into dist/
 *   4. npm publish     — publish from dist/ using npm trusted publishing
 *                        (OIDC — no NPM_TOKEN needed, provenance included)
 *
 * Note: lint is intentionally omitted here. By the time a Version Packages
 * PR is merged, every commit on main has already passed `biome ci` in
 * ci.yml. Running --write lint in this script would be wrong (it mutates
 * files), and re-running read-only lint is redundant.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const distDir = join(cwd, "dist");

const run = (cmd, opts = {}) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd, ...opts });
};

// Quality gates — catch anything that slipped through before touching npm
run("npm run check");
run("npm run test");

// Build with PUBLISH=true so the write-package-json plugin runs and
// places package.json / README.md / LICENSE into dist/
run("npm run publish");

if (!existsSync(distDir)) {
  throw new Error(
    `dist/ not found at ${distDir} after running 'npm run publish'`
  );
}

// Publish from the self-contained dist/ using OIDC trusted publishing.
// --provenance attaches a signed attestation to the package on npm.
// Authentication is handled by the OIDC token written to .npmrc by
// actions/setup-node — no NPM_TOKEN required.
run("npm publish --access public --provenance", { cwd: distDir });
