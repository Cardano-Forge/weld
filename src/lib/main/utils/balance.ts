import { hexToArrayBuffer } from "@/internal/utils/hex-to-array-buffer";
import { viewToString } from "@/internal/utils/view-to-string";
import { decode as decodeCbor } from "cbor-js";
import type { AssetName, PolicyId } from "./extensions";

export function decodeBalance(balance: unknown): unknown {
  if (typeof balance === "string") {
    return decodeCbor(hexToArrayBuffer(balance));
  }
  return balance;
}

export type ParseBalanceFilter =
  | "lovelace"
  | PolicyId
  | { policyId: PolicyId; assetName: AssetName };

export type ParsedBalance = {
  [key: "cardano" | PolicyId]: {
    [key: "lovelace" | AssetName]: number;
  };
};

export function parseBalance(balance: unknown, filter: "lovelace"): number;
export function parseBalance(balance: unknown, filter: PolicyId): { [key: AssetName]: number };
export function parseBalance(balance: unknown, filter: Extract<ParseBalanceFilter, object>): number;
export function parseBalance(balance: unknown): ParsedBalance;
export function parseBalance(
  balance: unknown,
  filter?: ParseBalanceFilter,
): ParsedBalance | { [key: AssetName]: number } | number {
  const decoded = decodeBalance(balance);

  let lovelace = 0;
  if (typeof decoded === "number") {
    lovelace = decoded;
  }
  if (Array.isArray(decoded)) {
    const first = decoded[0];
    if (typeof first === "number") {
      lovelace = first;
    }
  }

  if (filter === "lovelace") {
    return lovelace;
  }

  let assets = {};
  if (Array.isArray(decoded)) {
    const second = decoded[1];
    if (typeof second === "object" && second !== null) {
      assets = second;
    }
  }

  if (typeof filter === "object") {
    for (const [encodedPolicyId, policyAssets] of Object.entries(assets)) {
      if (typeof policyAssets !== "object" || policyAssets === null) {
        continue;
      }
      const policyId = decodeKey(encodedPolicyId);
      if (policyId !== filter.policyId) {
        continue;
      }
      for (const [encodedAssetName, quantity] of Object.entries(policyAssets)) {
        if (typeof quantity !== "number") {
          continue;
        }
        const assetName = decodeKey(encodedAssetName);
        if (assetName === filter.assetName) {
          return quantity;
        }
      }
    }
    return 0;
  }

  if (filter) {
    for (const [encodedPolicyId, policyAssets] of Object.entries(assets)) {
      if (typeof policyAssets !== "object" || policyAssets === null) {
        continue;
      }
      const policyId = decodeKey(encodedPolicyId);
      if (policyId !== filter) {
        continue;
      }
      const res: { [key: AssetName]: number } = {};
      for (const [encodedAssetName, quantity] of Object.entries(policyAssets)) {
        if (typeof quantity !== "number") {
          continue;
        }
        const assetName = decodeKey(encodedAssetName);
        res[assetName] = quantity;
      }
      return res;
    }
    return {};
  }

  const res: ParsedBalance = { cardano: { lovelace } };
  for (const [encodedPolicyId, policyAssets] of Object.entries(assets)) {
    if (typeof policyAssets !== "object" || policyAssets === null) {
      continue;
    }
    const policyId = decodeKey(encodedPolicyId);
    res[policyId] = {};
    for (const [encodedAssetName, quantity] of Object.entries(policyAssets)) {
      if (typeof quantity !== "number") {
        continue;
      }
      const assetName = decodeKey(encodedAssetName);
      res[policyId][assetName] = quantity;
    }
  }
  return res;
}

function decodeKey(key: string): string {
  return viewToString(new Uint8Array(key.split(",").map((p) => Number(p))), "hex");
}
