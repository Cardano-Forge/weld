import { dispatchEvent } from "@/internal/events";
import type { WalletConfig } from "@/lib/main/config";
import {
  type AddressBech32,
  type BalanceByPolicies,
  type Cbor,
  type DefaultWalletApi,
  type EnabledWalletApi,
  type Lovelace,
  type NetworkId,
  type Signature,
  WalletBalanceDecodeError,
  WalletDisconnectAccountError,
  type WalletInfo,
  type WalletKey,
  enableWallet,
} from "@/lib/utils";
import { hexToBech32 } from "@/lib/utils/hex-to-bech32";
import { hexToView } from "@/lib/utils/hex-to-view";
import { viewToString } from "@/lib/utils/view-to-string";
import cbor from "cbor-js";
import { handleAccountChangeErrors } from "./account-change";
import { ListenerManager } from "./listener-manager";
import { decodeBalance } from "./utils/decode-balance";

export type WalletHandler = {
  info: WalletInfo;
  initialize(): Promise<boolean>;
  getChangeAddress(): Promise<string>;
  getStakeAddress(): Promise<string>;
  getNetworkId(): Promise<NetworkId>;
  getBalance(): Promise<Cbor>;
  getBalanceLovelace(): Promise<Lovelace>;
  getBalanceAssets(): Promise<BalanceByPolicies>;
  getDefaultApi(): DefaultWalletApi;
  isConnected(): Promise<boolean>;
  isConnectedTo(wallet: WalletKey): Promise<boolean>;
  getUtxos(): Promise<string[] | undefined>;
  signTx(tx: string, partialSign: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
  signData(payload: string): Promise<Signature>;
};

export class DefaultWalletHandler implements WalletHandler {
  private _enabledApi: EnabledWalletApi;
  private _prevBalance: string | undefined;
  private _prevChangeAddress: string | undefined;
  private _prevRewardAddress: string | undefined;
  private _prevNetworkId: number | undefined;
  private _listeners = new ListenerManager();

  constructor(
    public info: WalletInfo,
    private _defaultApi: DefaultWalletApi,
    enabledApi: EnabledWalletApi,
    private _config: WalletConfig,
  ) {
    this._enabledApi = handleAccountChangeErrors(
      enabledApi,
      () => this._updateEnabledApi(),
      () => this._defaultApi.isEnabled(),
    );
    this._setup();
  }

  get apiVersion() {
    return this._defaultApi.apiVersion;
  }
  /**
   * Initializes the handler when it is needed for certain wallets.
   * @returns {Promise<boolean>} True if the initialization is completed, otherwise false.
   */
  async initialize(): Promise<boolean> {
    // No initialization needed for default wallet handler
    // meant to be extended on custom implementations
    return Promise.resolve(true);
  }

  /**
   * Gets the change address for the wallet.
   * @returns {Promise<AddressBech32>} The change address in Bech32 format.
   */
  async getChangeAddress(): Promise<AddressBech32> {
    let changeAddress = await this._enabledApi.getChangeAddress();
    const networkId = await this._enabledApi.getNetworkId();

    changeAddress = hexToBech32(changeAddress, "addr", networkId);

    if (changeAddress !== this._prevChangeAddress) {
      dispatchEvent(this.info.key, "wallet", "change-address", "update", {
        handler: this,
        changeAddress,
      });
      this._prevChangeAddress = changeAddress;
    }

    return changeAddress;
  }

  /**
   * Gets the stake address for the wallet.
   * @returns {Promise<AddressBech32>} The stake address in Bech32 format.
   */
  async getStakeAddress(): Promise<AddressBech32> {
    const rewardAddresses = await this._enabledApi.getRewardAddresses();
    const networkId = await this._enabledApi.getNetworkId();

    const rewardAddress = hexToBech32(rewardAddresses[0], "stake", networkId);

    if (rewardAddress !== this._prevRewardAddress) {
      dispatchEvent(this.info.key, "wallet", "reward-address", "update", {
        handler: this,
        rewardAddress,
      });
      this._prevRewardAddress = rewardAddress;
    }

    return rewardAddress;
  }

  /**
   * Gets the network ID for the wallet.
   * @returns {Promise<NetworkId>} The network ID.
   */
  async getNetworkId(): Promise<NetworkId> {
    const networkId = await this._enabledApi.getNetworkId();

    if (networkId !== this._prevNetworkId) {
      dispatchEvent(this.info.key, "wallet", "network", "update", {
        handler: this,
        networkId,
      });
      this._prevNetworkId = networkId;
    }

    return networkId;
  }

  /**
   * Gets the balance for the wallet in CBOR format.
   * @returns {Promise<Cbor>} The balance in CBOR format.
   */
  async getBalance(): Promise<Cbor> {
    const balanceCbor = await this._enabledApi.getBalance();

    if (balanceCbor !== this._prevBalance) {
      const balanceLovelace = decodeBalance(balanceCbor);

      dispatchEvent(this.info.key, "wallet", "balance", "update", {
        handler: this,
        cbor: balanceCbor,
        balanceLovelace: balanceLovelace,
      });
      this._prevBalance = balanceCbor;
    }

    return balanceCbor;
  }

  /**
   * Gets the balance for the wallet in Lovelace.
   * @returns {Promise<Lovelace>} The balance in Lovelace.
   * @throws {WalletBalanceDecodeError} If the balance cannot be decoded.
   */
  async getBalanceLovelace(): Promise<Lovelace> {
    const balanceCbor = await this.getBalance();
    const balanceLovelace = decodeBalance(balanceCbor);

    if (!balanceLovelace)
      throw new WalletBalanceDecodeError(
        `Could not retrieve the ${this.info.displayName} wallet's lovelace balance from cbor`,
      );

    return balanceLovelace;
  }

  /**
   * Gets the balance of assets for the wallet.
   * @returns {Promise<BalanceByPolicies>} The balance by policies.
   */
  async getBalanceAssets(): Promise<BalanceByPolicies> {
    const balance = await this.getBalance();
    const obj: BalanceByPolicies = { cardano: { lovelace: 0 } };

    if (balance) {
      const decoded = cbor.decode(hexToView(balance).buffer);
      if (typeof decoded === "number") {
        obj.cardano = { lovelace: decoded };
        return obj;
      }

      const [lovelace, assets] = decoded;
      obj.cardano = { lovelace };

      for (const policy of Object.keys(assets)) {
        const policyString = viewToString(
          new Uint8Array(policy.split(",").map((p) => Number(p))),
          "hex",
        );

        obj[policyString] = {};

        const assetNames = Object.keys(assets[policy]);

        for (const assetName of assetNames) {
          const nameString = viewToString(
            new Uint8Array(assetName.split(",").map((p) => Number(p))),
          );
          const quantity = assets[policy][assetName];
          obj[policyString][nameString] = quantity;
        }
      }
    }

    return obj;
  }

  /**
   * Gets the default API for the wallet.
   * @returns {DefaultWalletApi} The default wallet API.
   */
  getDefaultApi(): DefaultWalletApi {
    return this._defaultApi;
  }

  /**
   * Checks if the wallet is connected.
   * @returns {Promise<boolean>} True if the wallet is connected, otherwise false.
   */
  async isConnected(): Promise<boolean> {
    return this._defaultApi.isEnabled();
  }

  /**
   * Checks if the wallet is connected to a specific wallet key.
   * @param {WalletKey} wallet - The wallet key to check.
   * @returns {Promise<boolean>} True if connected to the specified wallet key, otherwise false.
   */
  async isConnectedTo(wallet: WalletKey): Promise<boolean> {
    if (this.info.key !== wallet) return false;
    return this.isConnected();
  }

  /**
   * Gets the UTXOs for the wallet.
   * @returns {Promise<string[] | undefined>} The UTXOs.
   */
  async getUtxos(): Promise<string[] | undefined> {
    return this._enabledApi.getUtxos();
  }

  /**
   * Signs a transaction.
   * @param {string} tx - The transaction to sign.
   * @param {boolean} [partialSign=true] - Whether to partially sign the transaction.
   * @returns {Promise<string>} The signed transaction.
   */
  async signTx(tx: string, partialSign = true): Promise<string> {
    return this._enabledApi.signTx(tx, partialSign);
  }

  /**
   * Submits a transaction.
   * @param {string} tx - The transaction to submit.
   * @returns {Promise<string>}
   */
  async submitTx(tx: string): Promise<string> {
    return this._enabledApi.submitTx(tx);
  }

  /**
   * Signs data with the wallet's stake address.
   * @param {string} payload - The data to sign.
   * @returns {Promise<Signature>} The signed data.
   */
  async signData(payload: string): Promise<Signature> {
    const stake = await this.getStakeAddress();
    return this._enabledApi.signData(stake, payload);
  }

  _cleanup(): void {
    this._listeners.removeAll();
  }

  private _isUpdating = false;
  private async _update({ force = false } = {}): Promise<void> {
    if (this._isUpdating && !force) return;
    try {
      this._isUpdating = true;
      await Promise.all([
        this.getBalance(),
        this.getNetworkId(),
        this.getStakeAddress(),
        this.getChangeAddress(),
      ]);
    } catch (error) {
      dispatchEvent(this.info.key, "wallet", "update", "error", { error });
    } finally {
      this._isUpdating = false;
    }
  }

  private _setup(): void {
    if (this._config.pollInterval) {
      this._listeners.addInterval(() => this._update(), this._config.pollInterval);
    }
    if (this._config.updateOnWindowFocus) {
      this._listeners.addEvent("window", "focus", () => this._update());
    }
  }

  private async _updateEnabledApi(): Promise<EnabledWalletApi> {
    const enabledApi = await enableWallet(this._defaultApi);
    if (!enabledApi) {
      // If wallet was enabled before and it fails to re-enable,
      // we assume the account was disconnected from within the wallet extension
      const message = `Could not update the ${this.info.displayName} wallet's API`;
      throw new WalletDisconnectAccountError(message);
    }

    this._enabledApi = handleAccountChangeErrors(
      enabledApi,
      () => this._updateEnabledApi(),
      () => this._defaultApi.isEnabled(),
    );

    void this._update({ force: true });

    return this._enabledApi;
  }
}
