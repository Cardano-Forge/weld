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
  - [Initialization](#initialization)
- [Usage](#usage)
  - [Wallet connection](#wallet-connection)
  - [Error handling](#error-handling)
    - [Synchronous errors](#synchronous-errors)
    - [Synchronous errors using React](#synchronous-errors-using-react)
    - [Asynchronous errors](#asynchronous-errors)
  - [Reactive variable](#reactive-variable)
  - [Other methods](#other-methods)
- [Persistence](#persistence)
  - [Automatic reconnection](#automatic-reconnection)
  - [Configuration](#configuration)
- [Events](#events)
  - [Semantic](#semantic)
  - [Naming](#naming)
  - [Events table](#events-table)
  - [Wildcard usage](#wildcard-usage)
  - [`weld:*`](#weld)
  - [`weld:wallet.*`](#weldwallet)
  - [`weld:wallet.balance.*`](#weldwalletbalance)
  - [`weld:wallet.balance.update.*`](#weldwalletbalanceupdate)
  - [`weld:wallet.balance.update.nami`](#weldwalletbalanceupdatenami)
- [Examples](#examples)
- [Methods](#methods)
  - [initialize](#initialize)
  - [getChangeAddress](#getchangeaddress)
  - [getStakeAddress](#getstakeaddress)
  - [getNetworkId](#getnetworkid)
  - [getBalance](#getbalance)
  - [getBalanceLovelace](#getbalancelovelace)
  - [getBalanceAssets](#getbalanceassets)
  - [getDefaultApi](#getdefaultapi)
  - [isConnected](#isconnected)
  - [isConnectedTo](#isconnectedto)
  - [getUtxos](#getutxos)
  - [signTx](#signtx)
  - [submitTx](#submittx)
  - [signData](#signdata)


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
    </React.StrictMode>,
  );
}
```

### Initialization
In certain situations, a dApp may require specific initialization. This is managed through the `wallet.handler.initialize` method. It should be invoked as early as possible within a component that falls under the Weld provider tree.

```typescript
const { wallet } = useWalletContext();

useEffect(() => {
  if (wallet.isConnected) {
    wallet.handler.initialize();
  }
}, [wallet]);
```

## Usage

Here are common use cases for an app utilizing this library.

### Wallet connection

Use the exported `SUPPORTED_WALLETS` constant to display the available wallets.
Additionally, you can use the `getInstalledExtensions` method or the `useInstalledExtensionsContext` to identify installed extensions, even if they are not officially supported.

```tsx
export const App = () => {
  const { wallet, connectWallet } = useWalletContext();

  useEffect(() => {
    if (wallet.isConnected) {
      wallet.handler.initialize();
    }
  }, [wallet]);

  return (
    <ExampleContainer>
      <article className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-wrap gap-4">
            {SUPPORTED_WALLETS.map(({ key, displayName }) => (
              <button
                key={key}
                type="button"
                className="btn btn-primary"
                onClick={() => connectWallet(key)}
              >
                {displayName}
              </button>
            ))}
          </div>
        </div>
      </article>
    </ExampleContainer>
  );
};
```

### Error handling

When using Weld, two types of errors can occur: **synchronous** errors and **asynchronous** ones.

#### Synchronous errors

Synchronous errors are the ones that get thrown by functions that you call explicitly, like `connect` and `disconnect`.
They are regular rejections that can be caught and handled by using normal language constructs:
```typescript
try {
  const handler = await connect(key);
} catch (error) {
  // handle connection error
}
```
#### Synchronous errors using React
You can use one of two functions to connect a wallet using the `useWallet` React hook.
If you just want to trigger the connection flow and don't care about the result, use the `connectWallet` function, which is guaranteed to never throw:
```typescript
// Doesn't return the wallet and never throws
connectWallet(key);
```

You can pass callbacks to the `connectWallet` function to handle success and error cases:
```typescript
connectWallet(key, {
  onSuccess(wallet) {
    console.log("wallet", wallet);
  },
  onError(error) {
    console.log("error", error);
  },
});
```

Alternatively, you can use the `connectWalletAsync` function, which returns a promise containing the wallet handler and throws errors when they occur.
```typescript
try {
  const wallet = await connectWalletAsync(key);
  console.log("wallet", wallet);
} catch (error) {
  console.log("error", error);
}
```

#### Asynchronous errors

Asynchronous errors are the ones that occur during side effects like polling updates.
Since they can occur anywhere and at any point, these errors cannot be caught by a try catch so we don't throw them as errors to prevent uncaught failure rejections.
Instead, we send [events](#events) which contain the errors and that can be listened for using our event system:
```typescript
subscribe("weld:wallet.update.error.*", (event) => {
  handleError(event.data.error);
});
```

The `useWallet` React hook wraps the asynchronous error events that are related to the current wallet and allows you to pass callbacks to handle them without having to manage the event subscriptions manually:
```tsx
// If using the weld context
<WeldProvider config={{ wallet: { onUpdateError: error => handleError(error) }}}>{children}</WeldProvider>

// If using the wallet provider
<WalletProvider config={{ onUpdateError: error => handleError(error)}}>{children}</WalletProvider>

// If using the useWallet hook directly
const { wallet } = useWallet({ onUpdateError: error => handleError(error) });
```

### Reactive variable

This very simple example would not be a real use case. But it shows that those values would be automatically updated if they are changing. This might seems trivial, but right now the default wallets API does not allow to achieve this easily. A valid use case for reactive variables are the connect button on a website header where the wallet icon is usally displayed as well as the balance.


This simple example may not reflect a practical use case, yet it demonstrates how these values are automatically updated upon change. While this may seem trivial, achieving this is not straightforward with the current default wallets API. 

A pertinent application for reactive variables would be the connect button on a website's header, where the wallet icon and balance are typically displayed.

```tsx
import { useWalletContext } from "@/lib/react/contexts/wallet.context";

export const App = () => {
  const { wallet } = useWalletContext();

  if (!wallet.isConnected) return <></>;

  return (
    <>
      <div>Connected to {wallet.handler.info.displayName}</div>
      <div>Stake address: {wallet.rewardAddress}</div>
      <div>Change address: {wallet.changeAddress}</div>
      <div>Network: {wallet.networkId}</div>
      <div>Lovelace: {wallet.balanceLovelace}</div>
    </>
  );
};

```
### Other methods

All default API functions are accessible and can be utilized via the `wallet.handler` class. If a function is unavailable, you can retrieve the default API by invoking the `wallet.handler.getDefaultApi` method.

```tsx
export const App = () => {
  const { wallet } = useWalletContext();

  useEffect(() => {
    if (wallet.isConnected) {
      wallet.handler.initialize();
    }
  }, [wallet]);

  return (
    <ExampleContainer>
      <article className="card bg-base-100 shadow-xl max-w-[800px] mx-auto">
        <div className="card-body text-center">
          {!wallet.isConnected ? (
            <h2>Connect your wallet</h2>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => wallet.handler.signTx("YOUR_TX", true)}
            >
              Sign
            </button>
          )}
        </div>
      </article>
    </ExampleContainer>
  );
};
```

## Persistence

Weld provides a flexible interface to handle wallet connection persistence.

### Automatic reconnection
When using the `useWallet` React hook, an attempt will be made to reconnect the persisted wallet on first mount.

If you are not using the `useWallet` hook, you can use the `getPersistedValue` helper function to retrieve the persisted wallet and connect it during the initialization of your app:
```typescript
function initApp() {
  const persistedWalletKey = getPersistedValue("connectedWallet");
  if (persistedWalletKey) {
    connect(persistedWalletKey).then((handler) => {
      console.log("handler", handler);
    });
  }
}
```
_Note: `getPersistedValue` always returns `undefined` when persistence is disabled._

### Configuration

By default, the user's wallet connection is persisted to [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
This behavior can be customized by providing a different [Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage) interface to the global configuration object:
```typescript
defaults.persistence.storage = sessionStorage;
```
The persistence features can be disabled through the global configuration object:
```typescript
defaults.persistence.enabled = false;
```


## Events

Events are a crucial feature of this library, enabling continuous synchronization between the dApp connector and the front-end. They trigger updates as necessary, such as when the wallet balance changes or when the user switches wallet accounts.

### Semantic

Events follow the specific naming convention `scope`.`namespace`.`type`, where the wildcard `*` can be used at the end of an event name to capture all corresponding events.

### Naming

**Scopes**: wallet

**Namespaces**: connection, balance, reward-address, change-address, network

**Types**: update, initiate, success, error

### Events table

| Scope  | Namespace      | Type     | Parameters                                                                        |
| ------ | -------------- | -------- | --------------------------------------------------------------------------------- |
| wallet | connection     | initiate | `undefined`                                                                       |
| wallet | connection     | success  | `{ handler: WalletHandler; }`                                                     |
| wallet | connection     | error    | `{ error: unknown; }`                                                             |
| wallet | update         | error    | `{ error: unknown; }`                                                             |
| wallet | balance        | update   | `{ handler: WalletHandler; cbor: string; balanceLovelace: number \| undefined; }` |
| wallet | reward-address | update   | `{ handler: WalletHandler; rewardAddress: string; }`                              |
| wallet | change-address | update   | `{ handler: WalletHandler; changeAddress: string; }`                              |
| wallet | network        | update   | `{ handler: WalletHandler; networkId: NetworkId; }`                               |

### Wildcard usage

### `weld:*`
Listen to every events triggered.

### `weld:wallet.*`
Listen to every events triggered on the `wallet` scope.

### `weld:wallet.balance.*`
Listen to every events triggered on the `wallet` scope and the `balance` namespace.

### `weld:wallet.balance.update.*`
Listen to every events triggered on the `wallet` scope, the `balance` namespace and the `update` type.

### `weld:wallet.balance.update.nami`
Listen to every events triggered on the `wallet` scope, the `balance` namespace, the `update` type and the specific `nami` key.

## Examples

> A recent version of Node.js is required for this project.

To run the examples, navigate to the project's root directory and execute `npm install`, then `npm run dev`.

Alternatively, you can directly explore the code by browsing the <a href="/documentation/examples/">examples</a> folder.

## Methods

### initialize

Initializes the handler when it is needed for certain wallets.

- **Returns**: `Promise<boolean>`

### getChangeAddress

Gets the change address for the wallet.

- **Returns**: `Promise<AddressBech32>`

### getStakeAddress

Gets the stake address for the wallet.

- **Returns**: `Promise<AddressBech32>`

### getNetworkId

Gets the network ID of the wallet.

- **Returns**: `Promise<NetworkId>`

### getBalance

Gets the balance of the wallet in CBOR format.

- **Returns**: `Promise<Cbor>`

### getBalanceLovelace

Gets the balance of the wallet in Lovelace.

- **Returns**: `Promise<Lovelace>`

### getBalanceAssets

Gets the balance of assets for the wallet categorized by policies.

- **Returns**: `Promise<BalanceByPolicies>`

### getDefaultApi

Gets the default API for the wallet.

- **Returns**: `DefaultWalletApi`

### isConnected

Checks if the wallet is connected.

- **Returns**: `Promise<boolean>`

### isConnectedTo

Checks if the wallet is connected to a specific wallet key.

- **Returns**: `Promise<boolean>`

### getUtxos

Gets the UTXOs for the wallet.

- **Returns**: `Promise<string[] | undefined>`

### signTx

Signs a transaction.

- **Parameters**: `tx: string`, `partialSign: boolean = true`
- **Returns**: `Promise<string>`

### submitTx

Submits a transaction to the network.

- **Parameters**: `tx: string`
- **Returns**: `Promise<string>`

### signData

Signs data with the wallet's stake address.

- **Parameters**: `payload: string`
- **Returns**: `Promise<Signature>`


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