<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="images/logo.png" alt="Logo" width="150" height="120">
  </a>

  <h3 align="center">Universal Wallet Connector</h3>

  <p align="center">
    Manage wallet connections across multiple 
    <br />
    blockchains using a single intuitive interface 
    <br />
    <a href="https://github.com/Cardano-Forge/weld/issues/new?labels=bug&template=bug-report.md">Report Bug</a>
    ·
    <a href="https://github.com/Cardano-Forge/weld/issues/new?labels=enhancement&template=feature-request.md">Request Feature</a>
  </p>
</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About](#about)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Examples](#examples)
  - [Usage](#usage)
    - [Connecting a Wallet](#connecting-a-wallet)
    - [Retrieve Connected Wallet Info](#retrieve-connected-wallet-info)
    - [Interacting with the Wallet](#interacting-with-the-wallet)
    - [Disconnecting the Wallet](#disconnecting-the-wallet)
    - [Retrieving Wallet Extensions](#retrieving-wallet-extensions)
    - [Updating Wallet Extensions](#updating-wallet-extensions)
- [Concepts](#concepts)
  - [Universal Reactive Stores](#universal-reactive-stores)
  - [Error handling](#error-handling)
    - [Synchronous errors](#synchronous-errors)
    - [Asynchronous errors](#asynchronous-errors)
  - [Wallet Connection Persistence](#wallet-connection-persistence)
    - [Automatic reconnection](#automatic-reconnection)
    - [Configuration](#configuration)
- [Cross-Chain Support](#cross-chain-support)
  - [Usage with Ethereum](#usage-with-ethereum)
  - [Usage with Polygon](#usage-with-polygon)
  - [Usage with Solana](#usage-with-solana)
- [Cross-Framework Support](#cross-framework-support)
    - [Usage with Svelte](#usage-with-svelte)
    - [Usage with Vanilla JavaScript](#usage-with-vanilla-javascript)
- [Server-Side Rendering](#server-side-rendering)

## About

**Weld** is a universal wallet connector library designed to make managing Web3 wallet connections seamless and intuitive. With a focus on flexibility and developer experience, Weld stands out among wallet connectors due to its innovative features:

- **Universal Reactivity System**  
  Weld's reactivity system is framework-agnostic, making it possible to integrate seamlessly with any frontend framework or Vanilla JavaScript. Weld's reactive stores enable developers to subscribe to specific state properties, minimizing unnecessary re-renders and improving performance, especially in complex applications.

- **Unified Cross-Chain Support**  
  Weld provides a single, unified API to interact with wallet extensions across multiple blockchain ecosystems, including Cardano, Ethereum, Polygon, and Solana. This means developers can manage wallet connections and user interactions consistently, regardless of the underlying blockchain.

- **Extensive TypeScript Support**  
  Weld is built with TypeScript from the ground up, offering comprehensive type definitions for all hooks and APIs. This provides a robust developer experience with powerful autocomplete and type inference.

## Getting Started

### Installation

```bash
npm install @ada-anvil/weld
```

### Examples

> **Note:** A recent version of Node.js is required to run the demo server and view the examples.

To get started with the examples, navigate to the project's root directory, install dependencies with `npm install`, and then start the demo server by running `npm run dev`.

Alternatively, you can explore the example code directly by browsing the [examples folder](/documentation/examples/).

### Usage

Since [React.js](https://react.dev/) is the most widely used frontend framework in the Web3 sphere, Weld provides bindings that make its integration straightforward.

_If you're looking to integrate Weld with another framework, please refer to the [section](#cross-framework-support) below._

First, make sure all required dependencies are installed:

```bash
npm install @ada-anvil/weld react
```

Then, wrap your entire application within the `WeldProvider`:

```tsx
import { WeldProvider } from "@ada-anvil/weld/react";
import { App } from "./app";

export function Index() {
  return (
    <WeldProvider>
      <App />
    </WeldProvider>
  );
}
```

Now, you can interact with the library through custom hooks from anywhere in your application.

```tsx
import { useWallet, useExtensions } from "@ada-anvil/weld/react";
```

#### Connecting a Wallet

`useWallet` exposes two wallet connection functions: `connect` and `connectAsync`.

`connect` doesn't return anything and is guaranteed to never throw.
You can pass callbacks to handle success and error cases:

```tsx
const connect = useWallet("connect");

connect("eternl", {
  onSuccess: wallet => {
    console.log("Connected to", wallet.displayName);
  },
  onError: error => {
    console.error("Failed to connect wallet", error);
  },
});
```

`connectAsync` returns a promise that resolves with the connected wallet or rejects in case of an error:

```tsx
const connectAsync = useWallet("connectAsync");

try {
  const wallet = await connectAsync("eternl"):
} catch (error) {
  console.error("Failed to connect wallet", error);
}
```

Weld has been thoroughly tested with the following wallet extensions:

| key         | Name       | Website                                                                                          |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------ |
| eternl      | Eternl     | https://chrome.google.com/webstore/detail/eternl/kmhcihpebfmpgmihbkipmjlmmioameka?hl=en-US       |
| nami        | Nami       | https://chrome.google.com/webstore/detail/nami/lpfcbjknijpeeillifnkikgncikgfhdo?hl=en-US         |
| tokeo       | Tokeo      | https://tokeopay.io                                                                              |
| flint       | Flint      | https://chrome.google.com/webstore/detail/flint-wallet/hnhobjmcibchnmglfbldbfabcgaknlkj?hl=en-US |
| gerowallet  | Gero       | https://chrome.google.com/webstore/detail/gerowallet/bgpipimickeadkjlklgciifhnalhdjhe/overview   |
| typhoncip30 | Typhon     | https://chrome.google.com/webstore/detail/typhon-wallet/kfdniefadaanbjodldohaedphafoffoh         |
| nufi        | NuFi       | https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US         |
| nufiSnap    | MetaMask   | https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US         |
| lace        | Lace       | https://chrome.google.com/webstore/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk?hl=en-US         |
| vespr       | VESPR      | https://www.vespr.xyz/                                                                           |

> **Note:** While these extensions are fully compatible with Weld, you can pass any `key` that corresponds to a valid extension API (i.e., `window.cardano[key]`) to the connect function. However, functionality is only guaranteed with the supported extensions listed above.

> **Tip:** Use the [extensions store](#retrieving-wallet-extensions) to dynamically retrieve all wallet extensions installed on the user’s machine.

#### Retrieve Connected Wallet Info

Info about the connection state and the currently connected wallet can be obtained from the `useWallet` hook:

```tsx
const wallet = useWallet("isConnected", "displayName", "balanceAda");

wallet.displayName; // string | undefined
wallet.balanceAda; // number | undefined

// Because of Weld's powerful type inference, `isConnected` can be used
// as a type guard to narrow down the other properies' type!
if (wallet.isConected) {
  wallet.displayName; // string
  wallet.balanceAda; // number
}

const displayedBalance = useWallet(s => s.balanceAda?.toFixed(2) ?? "-");
```

#### Interacting with the Wallet

You can interact with the currently connected wallet through the `handler` instance:

```tsx
const wallet = useWallet("isConnected", "handler");

const interact = async () => {
  if (!wallet.isConnected) {
    return;
  }
  const utxos = await wallet.handler.getUtxos();
  const res = await wallet.handler.signTx("<CBOR>");
};
```

#### Disconnecting the Wallet

```tsx
const disconnect = useWallet("disconnect");
const onDisconnect = () => disconnect();
```

#### Retrieving Wallet Extensions

You can retrieve the user's installed wallet extensions by using the `useExtensions` hook.

```tsx
const supportedArr = useExtensions("supportedArr");
const names = supportedArr.map(ext => ext.info.displayName);

const supportedMap = useExtensions("supportedArr");
const name = supportedMap.get("eternl")?.info.displayName;

const hasInstalledExtensions = useExtensions(s => s.allArr.length > 0);

const state = useExtensions("isLoading", "allArr");
if (state.isLoading) return "Loading...";
return (
  <ul>
    {state.allArr.map(ext => (
      <li key={ext.info.key}>{ext.info.displayName}</li>
    ))}
  </ul>
);
```

#### Updating Wallet Extensions

Extensions are automatically updated following Weld's configuration options.

These options can be changed through the Weld provider:

```tsx
return (
  <WeldProvider
    extensions={{
      updateOnWindowFocus: false,
      updateInterval: 30_000,
    }}
  >
    {children}
  </WeldProvider>
);
```

You can also trigger an update manually through the store's API:

```tsx
const updateExtensions = useExtensions("update");
const onWalletPickerOpen = () => updateExtensions();
```

## Concepts

### Universal Reactive Stores

Weld's reactive system is built to prevent useless work by allowing you to subscribe to specific parts of a store's state.

When using React.js bindings, this is done by passing predicate functions or attribute selectors to the different hooks:

```tsx
// A single property can be passed to `useWallet` to be returned directly
const isConnected = useWallet("isConnected");

// Multiple properties can be passed to `useWallet` to be returned in an object
const wallet = useWallet("isConnected", "balanceAda");

// The wallet store has smart type definitions that provide a nice DX
wallet.balanceAda; // inferred as `number | undefined`
if (wallet.isConnected) {
  wallet.balanceAda; // inferred as `number`
}

// A predicate function can be passed to `useWallet` to derive values from the store state.
// Note: Predicate functions are executed on every store state change but the result
//       is memoized and re-renders occur only when this result changes
const displayedBalance = useWallet(s => s.balanceAda?.toFixed(2) ?? "-");

// `useWallet` can be called without any arguments in which case the entire
// store state gets returned.
// However, this means that any change to the store will cause a re-render,
// which is why it's preferred to select only the data you need
// using one of the previously mentioned strategies.
const wallet = useWallet();
```

When using stores directly, listeners can be registered by calling the `subscribeWithSelector` and `subscribe` functions.

### Error handling

When using Weld, two types of errors can occur: **synchronous** errors and **asynchronous** ones.

#### Synchronous errors

Synchronous errors occur when you call wallet handler functions or `connectAsync`.

It's up to you to handle them using try/catch blocks.

#### Asynchronous errors

Asynchronous errors are the ones that occur during side effects like polling updates.
Since they can occur anywhere and at any point, these errors cannot be caught by a try catch so we don't throw them as errors to prevent uncaught failure rejections.

The provider wraps the asynchronous error events that are related to the current wallet and allows you to pass callbacks to handle them when they occur:

```tsx
<WeldProvider
  onUpdateError={(context, error) => handleError(context, error)}
  extensions={{ onUpdateError: error => handleError(error) }}
  wallet={{ onUpdateError: error => handleError(error) }}
>
  {children}
</WeldProvider>
```

### Wallet Connection Persistence

Weld offers a flexible interface for managing wallet connection persistence.
In most cases, you shouldn't need to use this feature as it's automatically handled by the wallet store.

```typescript
weld.wallet.subscribeWithSelector(
  state => state.key,
  key => {
    if (key) {
      defaults.storage.set("connectedWallet", key);
    } else {
      defaults.storage.remove("connectedWallet");
    }
  }
);
```

#### Automatic reconnection

When using the library, an attempt will be made to reconnect the persisted wallet on first mount.

If you disable the persistence feature, you can still use the `getPersistedValue` helper function to retrieve the persisted wallet and connect it during the initialization of your app.

```typescript
function initFunction() {
  const lastConnectedWallet = getPersistedValue("weld_connected-wallet");
  if (lastConnectedWallet) {
    weld.wallet.connect(lastConnectedWallet);
  }
}
```

> Note: `getPersistedValue` always returns `undefined` when persistence is disabled.

#### Configuration

By default, the user's wallet connection is persisted in a cookie to allow support for SSR.
This behavior can be customized by updating the configuration store to provide a different [Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage) interface.

Here's how to customize the persistence strategy to use [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) instead of cookies:

```tsx
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

Here's an example using the default configuration.

```typescript
weld.config.update({
  storage: {
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
  },
});
```

The persistence features can be disabled through the configuration store:

```typescript
weld.config.update({
  enablePersistence: false,
});
```

> Note: When using a SSR framework, make sure to set configuration options inside a client side file.

## Cross-Chain Support

Weld supports managing wallets and extensions across multiple blockchains.
Currently, Weld integrates with the following chains:

- [Cardano](#getting-started)
- [Ethereum](#usage-with-ethereum)
- [Polygon](#usage-with-polygon)
- [Solana](#usage-with-solana)

### Usage with Ethereum

First, make sure all required dependencies are installed:

```bash
npm install @ada-anvil/weld ethers
```

_To use the react bindings, you'll also need to make sure that react is installed and available_

Then, wrap your entire application within the `WeldEthProvider`:

```tsx
import { WeldEthProvider } from "@ada-anvil/weld/eth/react";
import { App } from "./app";

export function Index() {
  return (
    <WeldEthProvider>
      <App />
    </WeldEthProvider>
  );
}
```

Now, you can interact with the library through custom hooks from anywhere in your application.

```tsx
import { useEthWallet, useEthExtensions } from "@ada-anvil/weld/eth/react";
```

To use Weld's ethereum stores outside of React, use the `weldEth` instance as you would the `weld` instance.

```tsx
import { weldEth } from "@ada-anvil/weld/eth";
weldEth.wallet.subscribeWithSelector(
  s => s.isConnected,
  isConnected => {
    if (isConnected) {
      console.log("Eth wallet is connected");
    }
  }
);
```

### Usage with Polygon

First, make sure all required dependencies are installed:

```bash
npm install @ada-anvil/weld ethers
```

_To use the react bindings, you'll also need to make sure that react is installed and available_

Then, wrap your entire application within the `WeldPolyProvider`:

```tsx
import { WeldPolyProvider } from "@ada-anvil/weld/poly/react";
import { App } from "./app";

export function Index() {
  return (
    <WeldPolyProvider>
      <App />
    </WeldPolyProvider>
  );
}
```

Now, you can interact with the library through custom hooks from anywhere in your application.

```tsx
import { usePolyWallet, usePolyExtensions } from "@ada-anvil/weld/poly/react";
```

To use Weld's polygon stores outside of React, use the `weldPoly` instance as you would the `weld` instance.

```tsx
import { weldPoly } from "@ada-anvil/weld/poly";
weldPoly.wallet.subscribeWithSelector(
  s => s.isConnected,
  isConnected => {
    if (isConnected) {
      console.log("Poly wallet is connected");
    }
  }
);
```

### Usage with Solana

First, make sure all required dependencies are installed:

```bash
npm install @ada-anvil/weld @solana/web3.js @solana/spl-token
```

_To use the react bindings, you'll also need to make sure that react is installed and available_

Then, wrap your entire application within the `WeldSolProvider`:

```tsx
import { WeldSolProvider } from "@ada-anvil/weld/sol/react";
import { App } from "./app";

export function Index() {
  return (
    <WeldSolProvider>
      <App />
    </WeldSolProvider>
  );
}
```

Now, you can interact with the library through custom hooks from anywhere in your application.

```tsx
import { useSolWallet, useSolExtensions } from "@ada-anvil/weld/sol/react";
```

To use Weld's solana stores outside of React, use the `weldSol` instance as you would the `weld` instance.

```tsx
import { weldSol } from "@ada-anvil/weld/sol";
weldSol.wallet.subscribeWithSelector(
  s => s.isConnected,
  isConnected => {
    if (isConnected) {
      console.log("Sol wallet is connected");
    }
  }
);
```

## Cross-Framework Support

Weld is built with flexibility in mind and as such can be used with any frontend framework or even Vanilla JavaScript.

Here are some examples of how Weld can be integrated with popular modern frameworks.

_If you're looking to integrate Weld with React.js, please refer to our in depth [tutorial](#usage) above._

#### Usage with Svelte

You can easily integrate Weld with Svelte by leveraging the [context](https://svelte.dev/docs/svelte/context) API and by delegating fine-grained reactivity to the [\$state](https://svelte.dev/docs/svelte/$state) rune.

First, create a `.svelte.ts` file containing the context:

```typescript
import { createWeldInstance, type WeldConfig } from "@ada-anvil/weld";
import { getContext, setContext } from "svelte";

export class Weld {
  weld = createWeldInstance();
  // Use the $state rune to create a reactive object for each Weld store
  config = $state(this.weld.config);
  wallet = $state(this.weld.wallet);
  extensions = $state(this.weld.extensions);

  constructor(persist?: Partial<WeldConfig>) {
    this.weld.config.update({ updateInterval: 2000 });
    if (persist) this.weld.persist(persist);
    $effect(() => {
      this.weld.init();
      // Subscribe to Weld stores and update reactive objects when changse occur
      // Note: No need to use subscribeWithSelector as $state objects are deeply reactive
      this.weld.config.subscribe(s => (this.config = s));
      this.weld.wallet.subscribe(s => (this.wallet = s));
      this.weld.extensions.subscribe(s => (this.extensions = s));
      return () => this.weld.cleanup();
    });
  }
}

// Use the context API to scope weld stores and prevent unwanted sharing
// of data between clients when rendering on the server

const weldKey = Symbol("weld");

export function setWeldContext(persist?: Partial<WeldConfig>) {
  const value = new Weld(persist);
  setContext(weldKey, value);
  return value;
}

export function getWeldContext() {
  return getContext<ReturnType<typeof setWeldContext>>(weldKey);
}
```

Then, initialize the context **once** at the root of your app:

```html
<script>
  import { setWeldContext } from "./weld.svelte.ts";
  setWeldContext();
</script>
```

Finally, use the context anywhere in your application:

```html
<script>
  import { getWeldContext } from "./weld.svelte.ts";
  const weld = getWeldContext();
  const displayedBalance = $derived(weld.wallet.balanceAda?.toFixed(2) ?? "-");
</script>

<div>Balance: {displayedBalance}</div>
```

#### Usage with Vanilla JavaScript

Weld can be used without any framework. Here's an example of how you can leverage Weld's reactivity system in regular html and JavaScript:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weld x Vanilla JavaScript</title>
  </head>

  <body>
    <main>
      <section>
        <h2>Wallets</h2>
        <ul id="wallets"></ul>
      </section>
      <section>
        <h2>Connection</h2>
        Connecting to <span id="connecting-to">-</span><br />
        Connected to <span id="connected-to">-</span><br />
        Balance <span id="balance">-</span><br />
        <button onclick="window.Weld.wallet.connect('nami')">Connect nami</button>
      </section>
    </main>

    <script>
      function init() {
        window.Weld.config.update({ debug: true });

        window.Weld.extensions.subscribeWithSelector(
          s => s.allArr,
          exts => {
            const list = document.querySelector("#wallets");
            for (const ext of exts) {
              const item = document.createElement("li");
              item.textContent = ext.info.displayName;
              list?.appendChild(item);
            }
          }
        );

        window.Weld.wallet.subscribeWithSelector(
          s => s.isConnectingTo,
          isConnectingTo => {
            document.querySelector("#connecting-to").textContent = isConnectingTo ?? "-";
          }
        );

        window.Weld.wallet.subscribeWithSelector(
          s => s.displayName,
          displayName => {
            document.querySelector("#connected-to").textContent = displayName ?? "-";
          }
        );

        window.Weld.wallet.subscribeWithSelector(
          s => s.balanceAda,
          balance => {
            document.querySelector("#balance").textContent = balance?.toFixed(2) ?? "-";
          }
        );

        window.addEventListener("load", () => {
          window.Weld.init();
        });

        window.addEventListener("unload", () => {
          window.Weld.cleanup();
        });
      }
    </script>

    <script onload="init()" src="https://unpkg.com/@ada-anvil/weld@0.2.0/cdn.min.js" defer></script>
  </body>
</html>
```

> Note: When using a build tool like [Vite](https://vite.dev/), we recommend using a package manager instead of the CDN version to install and manage Weld:

```bash
npm install @ada-anvil/weld
```

And then:

```typescript
import { weld } from "@ada-anvil/weld";

weld.wallet.subscribeWithSelector(
  s => s.isConnected,
  isConnected => {
    // update your UI
  }
);
```

## Server-Side Rendering

When pre-rendering your application on the server, you can inform Weld about the last connected wallet so the store state initializes with the correct values.

For example, when using Next.js, you can avoid hydration errors by retrieving the connected wallet cookie in a server component.
You can then pass this value as an initial parameter to the Weld provider:

```tsx
import { cookies } from "next/headers";
import { STORAGE_KEYS } from "@ada-anvil/weld/server";
import { WeldProvider } from "@ada-anvil/weld/react";

export default function RootLayout({ children }) {
  const lastConnectedWallet = cookies().get(STORAGE_KEYS.connectedWallet)?.value;
  return <WeldProvider wallet={{ tryToReconnectTo: lastConnectedWallet }}>{children}</WeldProvider>;
}
```

This setup ensures that the correct wallet connection state is available when the application first renders.

> <small>Note: This approach works only if you use cookies to store persisted data, as they are accessible on both the client and server— unlike window.localStorage, for example, which is only available in the browser.</small>

---

<p align="center">
  |
  <a href="https://ada-anvil.io">Ada Anvil</a>
  |
  <a href="CONTRIBUTING.md">Contributing</a>
  |
  <a href="https://discord.gg/RN4D7wzc"><img style="height: 0.8rem; margin-right: 4px" src=".github/discord.svg" alt="Discord">Discord</a>
  |
  <a href="https://x.com/ada_anvil"><img style="height: 0.70rem; margin-bottom: -1px; margin-right: 4px" src=".github/x.svg" alt="X">@ada_anvil</a>
</p>
