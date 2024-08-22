# Contributing

## How to report a bug

<a href="https://github.com/Cardano-Forge/weld/issues/new?labels=bug&template=bug-report.md">Report Bug</a>

## How to request a new feature

<a href="https://github.com/Cardano-Forge/weld/issues/new?labels=enhancement&template=feature-request.md">Request Feature</a>

## Need help getting started ?

Join our discord channel <a href="https://discord.gg/RN4D7wzc"><img src=".github/discord.svg" alt="Discord">Discord</a>

## Adding a new wallet

See here: [Add new wallet](./documentation/ADD_NEW_WALLET.md)


## Contributing

1. Open a GitHub issue to track and discuss the feature/bug fix.
2. Fork the project.
3. Create a branch.
4. Commit and push your changes.
5. Create a PR to the upstream `main` branch.

### Local Development

The project is divided into two directories: `src/`, which contains the core library code, and `documentation/`, which includes the code for testing and developing features.

*Install and start the development server*

```bash
npm install
npm run dev
```
Then, navigate to : `http://localhost:5173`.

This development environment launches a React app featuring examples found in `documentation/examples/`.
