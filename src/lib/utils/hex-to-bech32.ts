import { bech32 } from "bech32";
import type { AddressBech32, AddressHex, NetworkId } from "./extensions";

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Hex string must have an even length");
  const byteArray = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    byteArray[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return byteArray;
}

const stakeAddressHexLength = 58;

export function ensurePrefix(
  input: AddressHex,
  /** The network cannot be infered from an unprefixed stake address hex */
  networkId: NetworkId,
): AddressHex {
  if (input.length === stakeAddressHexLength - 2) {
    const prefix = networkId === 1 ? "e1" : "e0";
    return `${prefix}${input}`;
  }
  return input;
}

export function stripPrefix(input: AddressHex): AddressHex {
  if (input.length === stakeAddressHexLength) {
    return input.slice(2);
  }
  return input;
}

export function isBech32Address(input: string): input is AddressBech32 {
  return input.startsWith("addr") || input.startsWith("stake");
}

export function hexToBech32(input: AddressHex, networkId: NetworkId): AddressBech32 {
  if (isBech32Address(input)) {
    return input;
  }

  const hex = ensurePrefix(input, networkId);

  let prefix = "addr";
  if (hex.length === stakeAddressHexLength) {
    prefix = "stake";
  }
  if (networkId !== 1) {
    prefix += "_test";
  }

  const byteArray = hexToUint8Array(hex);
  const words = bech32.toWords(byteArray);
  return bech32.encode(prefix, words, 1000);
}
