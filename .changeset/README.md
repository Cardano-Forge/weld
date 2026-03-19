# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

## Adding a changeset to your PR

Run this from the repo root and follow the prompts:

```sh
npx changeset
```

You'll be asked:
1. **Which packages changed?** — pick `@ada-anvil/weld`, `@ada-anvil/weld-plugin-hodei`, or both
2. **What kind of change?** — `patch` (bug fix), `minor` (new feature), `major` (breaking change)
3. **Describe the change** — one sentence that will appear in the CHANGELOG

Commit the generated `.md` file with the rest of your PR.

## How releases work

```
Your PR (with .changeset file) → merged to main
        ↓
Changesets bot opens a "Version Packages" PR
  • bumps package.json versions
  • writes CHANGELOG.md entries
        ↓
"Version Packages" PR merged to main
        ↓
release.yml publishes changed packages to npm independently
  @ada-anvil/weld and @ada-anvil/weld-plugin-hodei version separately
```

No manual version bumps, no manual `npm publish`.
