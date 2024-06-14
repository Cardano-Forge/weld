const core = require("@actions/core");
const { readFileSync, writeFileSync } = require("node:fs");

try {
  const bump = core.getInput("bump");

  const file = `./package.json`;
  const pkg = JSON.parse(readFileSync(file));

  const version = pkg.version;
  const [major, minor, patch] = version.split(".").map((v) => parseInt(v, 10));

  let newVersion = "";

  switch (bump) {
    case "major":
      newVersion = `${major + 1}.0.0`;
      break;
    case "minor":
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case "patch":
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  if (newVersion.length) {
    pkg.version = newVersion;

    writeFileSync(file, JSON.stringify(pkg, null, 2));
    console.log(
      `Updated ${pkg.name} package version: ${version} -> ${newVersion}`
    );
    core.setOutput("version", newVersion);
  } else {
    core.setFailed("Invalid bump value. Recieved: " + increment);
  }
} catch (error) {
  core.setFailed("Error: " + error.message);
}
