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

- [Introduction](#introduction)
  - [Why Another Wallet Connector?](#why-another-wallet-connector)
  - [What's New?](#whats-new)
  - [What's Not New](#whats-not-new)
- [Get Started](#get-started)
  - [Weld provider](#weld-provider)
  - [Initialization](#initialization)
- [Usage](#usage)
  - [Connection](#connection)
  - [Reactive Variable](#reactive-variable)
  - [Other Methods](#other-methods)
- [Events](#events)
  - [Semantic](#semantic)
  - [Naming](#naming)
  - [Events Table](#events-table)
  - [Wildcard Usage](#wildcard-usage)
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

### Connection

Utilize the exported `SUPPORTED_WALLETS` constant to display the available wallets. Additionally, you can use the `getInstalledExtensions` method or the `useInstalledExtensionsContext` to identify installed extensions, even if they are not officially supported.

```typescript
export const App = () => {
  const { wallet, connectWallet } = useWalletContext();

  const handleConnectWallet = async (key: WalletKey) => {
    await connectWallet(key);
  };

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
                onClick={() => handleConnectWallet(key)}
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

### Reactive variable

This very simple example would not be a real use case. But it shows that those values would be automatically updated if they are changing. This might seems trivial, but right now the default wallets API does not allow to achieve this easily. A valid use case for reactive variables are the connect button on a website header where the wallet icon is usally displayed as well as the balance.


This sinple example may not reflect a practical use case, yet it demonstrates how these values are automatically updated upon change. While this may seem trivial, achieving this is not straightforward with the current default wallets API. 

A pertinent application for reactive variables would be the connect button on a website's header, where the wallet icon and balance are typically displayed.

```typescript
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

```typescript
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

## Events

Events are a crucial feature of this library, enabling continuous synchronization between the dApp connector and the front-end. They trigger updates as necessary, such as when the wallet balance changes or when the user switches wallet accounts.

### Semantic

Events follow the specific naming convention `scope`.`namespace`.`type`, where the wildcard `*` can be used at the end of an event name to capture all corresponding events.

### Naming

**Scopes**: wallet

**Namespaces**: connection, balance, reward-address, change-address, network

**Types**: update, initiate, success, error

### Events table

| Scope | Namespace | Type| Parameters |
|--|--|--|--|
| wallet | connection | initiate | `undefined` |
| wallet | connection | success | `{ handler: WalletHandler; }` |
| wallet | connection | error | `{ error: unknown; }` |
| wallet | update | error | `{ error: unknown; }` |
| wallet | balance | update | `{ handler: WalletHandler; cbor: string; balanceLovelace: number \| undefined; }` |
| wallet | reward-address | update | `{ handler: WalletHandler; rewardAddress: string; }` |
| wallet | change-address | update | `{ handler: WalletHandler; changeAddress: string; }` |
| wallet | network | update | `{ handler: WalletHandler; networkId: NetworkId; }` |

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

Alternatively, you can directly explore the code by browsing the <a href="/src/documentation/examples/">examples</a> folder.

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
