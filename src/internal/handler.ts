import {
  type AddressBech32,
  type AddressHex,
  type BalanceByPolicies,
  type Cbor,
  type DefaultWalletApi,
  type EnabledWalletApi,
  type Lovelace,
  type NetworkId,
  type Signature,
  WalletBalanceDecodeError,
  type WalletInfo,
  type WalletKey,
} from "@/lib/utils";
import { hexToBech32 } from "@/lib/utils/hex-to-bech32";
import { hexToView } from "@/lib/utils/hex-to-view";
import { viewToString } from "@/lib/utils/view-to-string";
import cbor from "cbor-js";
import { decodeBalance } from "./utils/decode-balance";

export type WalletHandler = {
  info: WalletInfo;
  defaultApi: DefaultWalletApi;
  reenable(): Promise<boolean>;
  getChangeAddressHex(): Promise<AddressHex>;
  getChangeAddress(): Promise<AddressBech32>;
  getStakeAddressHex(): Promise<AddressHex>;
  getStakeAddress(): Promise<AddressBech32>;
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
  constructor(
    public readonly info: WalletInfo,
    public readonly defaultApi: DefaultWalletApi,
    protected _enabledApi: EnabledWalletApi,
    protected _enable: () => Promise<EnabledWalletApi | undefined> | EnabledWalletApi | undefined,
  ) {}

  async reenable(): Promise<boolean> {
    const enabledApi = await this._enable();
    if (enabledApi) {
      this._enabledApi = enabledApi;
      return true;
    }
    return false;
  }

  /**
   * Gets the change address for the wallet.
   * @returns The change address in hex format.
   */
  async getChangeAddressHex(): Promise<AddressHex> {
    return this._enabledApi.getChangeAddress();
  }

  /**
   * Gets the change address for the wallet.
   * @returns The change address in Bech32 format.
   */
  async getChangeAddress(): Promise<AddressBech32> {
    const hex = await this.getChangeAddressHex();
    const networkId = await this._enabledApi.getNetworkId();
    return hexToBech32(hex, networkId);
  }

  /**
   * Gets the stake address for the wallet.
   * @returns The stake address in hex format.
   */
  async getStakeAddressHex(): Promise<AddressHex> {
    const rewardAddresses = await this._enabledApi.getRewardAddresses();
    return rewardAddresses[0];
  }

  /**
   * Gets the stake address for the wallet.
   * @returns The stake address in Bech32 format.
   */
  async getStakeAddress(): Promise<AddressBech32> {
    const hex = await this.getStakeAddressHex();
    const networkId = await this._enabledApi.getNetworkId();
    return hexToBech32(hex, networkId);
  }

  /**
   * Gets the network ID for the wallet.
   * @returns The network ID.
   */
  async getNetworkId(): Promise<NetworkId> {
    return this._enabledApi.getNetworkId();
  }

  /**
   * Gets the balance for the wallet in CBOR format.
   * @returns The balance in CBOR format.
   */
  async getBalance(): Promise<Cbor> {
    return this._enabledApi.getBalance();
  }

  /**
   * Gets the balance for the wallet in Lovelace.
   * @returns The balance in Lovelace.
   * @throws {WalletBalanceDecodeError} If the balance cannot be decoded.
   */
  async getBalanceLovelace(): Promise<Lovelace> {
    const balanceCbor = await this.getBalance();
    const balanceLovelace = decodeBalance(balanceCbor);

    if (typeof balanceLovelace !== "number") {
      throw new WalletBalanceDecodeError(
        `Could not retrieve the ${this.info.displayName} wallet's lovelace balance from cbor`,
      );
    }

    return balanceLovelace;
  }

  /**
   * Gets the balance of assets for the wallet.
   * @returns The balance by policies.
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
   * @returns The default wallet API.
   */
  getDefaultApi(): DefaultWalletApi {
    return this.defaultApi;
  }

  /**
   * Checks if the wallet is connected.
   * @returns True if the wallet is connected, otherwise false.
   */
  async isConnected(): Promise<boolean> {
    return this.defaultApi.isEnabled();
  }

  /**
   * Checks if the wallet is connected to a specific wallet key.
   * @param wallet - The wallet key to check.
   * @returns True if connected to the specified wallet key, otherwise false.
   */
  async isConnectedTo(wallet: WalletKey): Promise<boolean> {
    if (this.info.key !== wallet) return false;
    return this.isConnected();
  }

  /**
   * Gets the UTXOs for the wallet.
   * @returns The UTXOs.
   */
  async getUtxos(): Promise<string[] | undefined> {
    return this._enabledApi.getUtxos();
  }

  /**
   * Signs a transaction.
   * @param tx - The transaction to sign.
   * @param [partialSign=true] - Whether to partially sign the transaction.
   * @returns The signed transaction.
   */
  async signTx(tx: string, partialSign = true): Promise<string> {
    return this._enabledApi.signTx(tx, partialSign);
  }

  /**
   * Submits a transaction.
   * @param tx - The transaction to submit.
   * @returns
   */
  async submitTx(tx: string): Promise<string> {
    return this._enabledApi.submitTx(tx);
  }

  /**
   * Signs data with the wallet's stake address.
   * @param payload - The data to sign.
   * @returns The signed data.
   */
  async signData(payload: string): Promise<Signature> {
    const stake = await this.getStakeAddress();
    return this._enabledApi.signData(stake, payload);
  }
}
