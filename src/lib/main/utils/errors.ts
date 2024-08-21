export class WalletConnectionError extends Error {
  constructor(message?: string | undefined) {
    super(message);
    this.name = "Anvil Weld - WalletConnectionError";
  }
}

export class WalletUtxosUpdateError extends Error {
  constructor(message?: string | undefined) {
    super(message);
    this.name = "Anvil Weld - WalletUtxosUpdateError";
  }
}

export class WalletConnectionAbortedError extends Error {
  constructor(message?: string | undefined) {
    super(message);
    this.name = "Anvil Weld - WalletConnectionAbortedError";
  }
}

export class WalletBalanceDecodeError extends Error {
  constructor(message?: string | undefined) {
    super(message);
    this.name = "Anvil Weld - WalletBalanceDecodeError";
  }
}

export class WalletDisconnectAccountError extends Error {
  constructor(message?: string | undefined) {
    super(message);
    this.name = "Anvil Weld - WalletDisconnectAccountError";
  }
}
