<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="images/logo.png" alt="Logo" width="150" height="120">
  </a>

  <h3 align="center">Universal Wallet Connector</h3>

  <p align="center">
    The last wallet connector you will need!
    <br />
    <a href="https://github.com/Cardano-Forge/universal-wallet-connector/issues/new?labels=bug&template=bug-report.md">Report Bug</a>
    ·
    <a href="https://github.com/Cardano-Forge/universal-wallet-connector/issues/new?labels=enhancement&template=feature-request.md">Request Feature</a>
  </p>
</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Introduction](#introduction)
  - [Why Another Wallet Connector?](#why-another-wallet-connector)
  - [What's New?](#whats-new)
  - [What's not new](#whats-not-new)
- [Get started](#get-started)
  - [Weld provider](#weld-provider)
- [Usage](#usage)
  - [Wallet connection](#wallet-connection)
  - [Error handling](#error-handling)
    - [Synchronous errors](#synchronous-errors)
    - [Asynchronous errors](#asynchronous-errors)
  - [Reactive variable](#reactive-variable)
  - [Other methods](#other-methods)
- [Selectors](#selectors)
- [Persistence](#persistence)
  - [Automatic reconnection](#automatic-reconnection)
  - [Configuration](#configuration)
- [Usage with Next.js](#usage-with-nextjs)
- [Examples](#examples)
- [Wallet hook exports](#wallet-hook-exports)
  - [Variables](#variables)
  - [Methods](#methods)

## Introduction

### Why Another Wallet Connector?

As developers, we aim to concentrate on our applications and objectives. However, while working with Cardano's dApps, we encountered several issues, such as:

- Account changes causing crashes
- Network changes occurring without the front-end's awareness
- Most wallets not handling disconnections properly
- The hassle of tracking the wallet address, stake address, and network in real-time
- Ultimately, we want a solution that simply works

### What's New?

We aim to bridge the gap between our ideal dApp functionalities and the current market offerings by:

- Standardizing usage across different wallets
- Implementing reactive variables for addresses, stake address, network, and balance
- Dispatching custom events upon relevant wallet changes

### What's not new

Basic functions remain accessible through the library. Our goal is not to complicate the process, but to streamline the implementation of the default wallet API. By integrating reactive variables and custom events, we aim to enhance clarity and transparency regarding the activities on the dApp side.

## Get started

### Weld provider

After installing the library, wrap your App within the `WeldProvider`.

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { WeldProvider } from "@/lib/react/contexts/weld.context";
import { App } from "./app";

const root = document.querySelector("#root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WeldProvider>
        <App />
      </WeldProvider>
    </React.StrictMode>
  );
}
```

## Usage

Here are common use cases for an app utilizing this library.

### Wallet connection

Use the exported `SUPPORTED_WALLETS` constant to display the available wallets.
Additionally, you can use the `useExtensions` hooke to identify installed extensions, even if they are not officially supported.

```tsx
const supportedExtensions = useExtensions((s) => s.supportedMap);
const unsupportedExtensions = useExtensions((s) => s.unsupportedMap);
const allExtensions = useExtensions((s) => s.allMap);

// or

const supportedExtensions = useExtensions((s) => s.supportedArr);
const unsupportedExtensions = useExtensions((s) => s.unsupportedArr);
const allExtensions = useExtensions((s) => s.allArr);
```

You will be able to connect the wallet using one of the two connect functions exported from the `useWallet` hook.

```tsx
const walletHook = useWallet();

walletHook.connect(key);

// or

const wallet = await walletHook.connectAsync(key);
```

See [this implemantation](documentation/commons/wallet-dialog/index.tsx) for a use case example.

### Error handling

When using Weld, two types of errors can occur: **synchronous** errors and **asynchronous** ones.

#### Synchronous errors

You can use one of two functions to connect a wallet using the `useWallet` React hook.
If you just want to trigger the connection flow and don't care about the result, use the `connect` function, which is guaranteed to never throw:

```typescript
const walletHook = useWallet();
// Doesn't return the wallet and never throws
walletHook.connect(key);
```

You can pass callbacks to the `connect` function to handle success and error cases:

```typescript
const walletHook = useWallet();

walletHook.connect(key, {
  onSuccess(wallet) {
    console.log("wallet", wallet);
  },
  onError(error) {
    console.log("error", error);
  },
});
```

See [this implemantation](documentation/commons/wallet-dialog/index.tsx) for a use case example.

Alternatively, you can use the `connectAsync` function, which returns a promise containing the wallet handler and throws errors when they occur.

```typescript
const walletHook = useWallet();

try {
  const wallet = await walletHook.connectAsync(key);
  console.log("wallet", wallet);
} catch (error) {
  console.log("error", error);
}
```

#### Asynchronous errors

Asynchronous errors are the ones that occur during side effects like polling updates.
Since they can occur anywhere and at any point, these errors cannot be caught by a try catch so we don't throw them as errors to prevent uncaught failure rejections.

The provider wraps the asynchronous error events that are related to the current wallet and allows you to pass callbacks to handle them without having to manage the event subscriptions manually:

```tsx
<WeldProvider
  onUpdateError={(type, error) => handleError(error)}
  extensions={{ onUpdateError: (error) => handleError(error) }}
  wallet={{ onUpdateError: (error) => handleError(error) }}
>
  {children}
</WeldProvider>
```

### Reactive variable

This very simple example would not be a real use case. But it shows that those values would be automatically updated if they are changing. This might seems trivial, but right now the default wallets API does not allow to achieve this easily. A valid use case for reactive variables are the connect button on a website header where the wallet icon is usally displayed as well as the balance.

This simple example may not reflect a practical use case, yet it demonstrates how these values are automatically updated upon change. While this may seem trivial, achieving this is not straightforward with the current default wallets API.

A pertinent application for reactive variables would be the connect button on a website's header, where the wallet icon and balance are typically displayed.

```tsx
export const App = () => {
  const wallet = useWallet();

  if (!wallet.isConnected) return <></>;

  return (
    <>
      <div>Connected to {wallet.displayName}</div>
      <div>Stake address: {wallet.stakeAddressBech32}</div>
      <div>Change address: {wallet.changeAddressBech32}</div>
      <div>Network: {wallet.networkId}</div>
      <div>Lovelace: {wallet.balanceLovelace}</div>
    </>
  );
};
```

### Other methods

All default API functions are accessible and can be utilized via the `wallet.handler` class. If a function is unavailable, you can retrieve the default API by invoking the `wallet.handler.getDefaultApi` method.

```tsx
const wallet = useWallet();

await wallet.handler.signTx("YOUR_TX", true);
```

See [this implemantation](documentation/examples/d-other-methods/app.tsx) for a use case example.

## Selectors

React state selectors are functions or hooks that help manage and access specific parts of a component's state. They allow you to efficiently retrieve and update only the necessary pieces of state within a component, **reducing the need for re-rendering the entire component tree** when changes occur. By using state selectors, you can **optimize performance** by ensuring that only the relevant parts of the UI are updated, improving responsiveness and efficiency. This targeted state management makes your application more maintainable and scalable, as it prevents unnecessary computations and enhances overall performance.

> It is crucial to keep the state minimal and derive additional values from it whenever possible.

### Basic selector concepts

Getting a single value

```typescript
const displayName = useWallet("displayName");

// or

const displayName = useWallet((state) => state.displayName);
```

Getting multiple values

```typescript
const { displayName, icon } = useWallet("displayName", "icon");

// or

const { displayName, icon } = useWallet((state) => ({
  displayName: state.displayName,
  icon: state.icon,
}));
```

### Deriving data with selectors

Deriving data can be helpful for simple tasks such as formatting the ADA balance, as shown in this [example](documentation/examples/b-simple-wallet-connect/app.tsx)

```typescript
const balance = useWallet((state) => state.balanceAda?.toFixed(2));
```

It can also be used to create custom states, as demonstrated in our [example](documentation/commons/wallet-dialog/wallet-btn.tsx).

```typescript
const wallet = useWallet((s) => ({
  isConnectingTo: s.isConnectingTo,
  isLoading: info.key === s.isConnectingTo,
}));
```

## Persistence

Weld offers a flexible interface for managing wallet connection persistence. In most cases, you shouldn't need to use this feature.

```typescript
weld.wallet.subscribeWithSelector(
  (state) => state.key,
  (key) => {
    if (key) {
      defaults.storage.set("connectedWallet", key);
    } else {
      defaults.storage.remove("connectedWallet");
    }
  }
);
```

### Automatic reconnection

When using the library, an attempt will be made to reconnect the persisted wallet on first mount.

If you are not using the automatic reconnection, you can use the `getPersistedValue` helper function to retrieve the persisted wallet and connect it during the initialization of your app.

```typescript
const walletHook = useWallet();
const lastConnectedWallet = getPersistedValue("connectedWallet");

if (lastConnectedWallet) {
  walletHook.connect(lastConnectedWallet);
}
```

_Note: `getPersistedValue` always returns `undefined` when persistence is disabled._

### Configuration

By default, the user's wallet connection is persisted to [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
This behavior can be customized by providing a different [Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage) interface to the global configuration object.

Here’s how to customize the persistence using the WeldProvider:

```typescriptreact
import { WeldProvider } from "@ada-anvil/weld/react";

export default function RootLayout({ children }) {
  return (
    <WeldProvider
      storage={{
        get(key) {
            return window.localStorage.getItem(key) ?? undefined;
          },
        set(key, value) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, value);
          }
        },
        remove(key) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(key);
          }
        },
        }}
    >
      {children}
    </WeldProvider>
  );
}
```

Here’s an example using the default configuration.

```typescript
defaults.persistence.storage = {
  get(key) {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(key) ?? undefined;
    }
  },
  set(key, value) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  },
  remove(key) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  },
};
```

The persistence features can be disabled through the global configuration object:

```typescript
defaults.persistence.enabled = false;
```

_Note: When using a SSR framework, make sure to set configuration options inside a client side file_

## Usage with Next.js

When using Next.js, you can prevent hydration errors by retrieving the connected wallet cookie in a server component
and passing it as initial value to the provicer.

```typescriptreact
import { cookies } from "next/headers";
import { STORAGE_KEYS } from "@ada-anvil/weld/server";
import { WeldProvider } from "@ada-anvil/weld/react";

export default function RootLayout({ children }) {
  const isConnectingTo = cookies().get(STORAGE_KEYS.connectedWallet)?.value;
  return (
    <WeldProvider
      config={{
        wallet: {
          initialState: { isConnectingTo },
        },
      }}
    >
      {children}
    </WeldProvider>
  );
}
```

## Examples

> A recent version of Node.js is required for this project.

To run the examples, navigate to the project's root directory and execute `npm install`, then `npm run dev`.

Alternatively, you can directly explore the code by browsing the <a href="/documentation/examples/">examples</a> folder.

## Wallet hook exports

### Variables

`balanceAda`, `balanceLovelace`, `changeAddressHex`,`changeAddressBech32`, `utxos`, `displayName`, `handler`, `icon`, `isConnected`, `isConnectingTo`, `key`, `networkId`, `stakeAddressHex`, `stakeAddressBech32`, `supported`, `supportsTxChaining`, `website`

### Methods

`connect`, `connectAsync`, `disconnect`

---

<p align="center">
  |
  <a href="https://ada-anvil.io">Ada Anvil</a>
  |
  <a href="CONTRIBUTING.md">Contributing</a>
  |
  <a href="https://discord.gg/RN4D7wzc"><img src=".github/discord.svg" alt="Discord">Discord</a>
  |
  <a href="https://x.com/ada_anvil"><img src=".github/x.svg" alt="X"> X (@ada_anvil)</a>
</p>
