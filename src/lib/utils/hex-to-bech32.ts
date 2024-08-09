import { bech32 } from "bech32";
import {
  type ChangeAddressBech32,
  type ChangeAddressHex,
  type StakeAddressBech32,
  type StakeAddressHex,
  isStakeAddressHex,
  type AddressBech32,
  type AddressHex,
  type ChangeAddressBech32Prefix,
  type StakeAddressBech32Prefix,
} from "./extensions";

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Hex string must have an even length");
  const byteArray = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    byteArray[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return byteArray;
}

export function isBech32Address(input: string): input is AddressBech32 {
  return input.startsWith("addr") || input.startsWith("stake");
}

function getBech32Prefix(input: AddressHex): StakeAddressBech32Prefix | ChangeAddressBech32Prefix {
  if (isStakeAddressHex(input)) {
    return input.startsWith("e0") ? "stake_test" : "stake";
  }
  return input.startsWith("00") ? "addr_test" : "addr";
}

export function hexToBech32(input: StakeAddressHex): StakeAddressBech32;
export function hexToBech32(input: ChangeAddressHex): ChangeAddressBech32;
export function hexToBech32(input: AddressHex): AddressBech32 {
  if (isBech32Address(input)) {
    return input;
  }

  const prefix = getBech32Prefix(input);
  const byteArray = hexToUint8Array(input);
  const words = bech32.toWords(byteArray);

  return bech32.encode(prefix, words, 1000) as AddressBech32;
}
