import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

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

writeFileSync("dist/package.json", JSON.stringify(pkg, null, 2));
