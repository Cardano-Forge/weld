import { bech32 } from "bech32";

// Helper function to determine the prefix to append based on the networkId and isScript flag
function determinePrefixToAppend(networkId: number, isScript: boolean): string {
  if (isScript) {
    return networkId === 1 ? "f1" : "f0";
  }
  return networkId === 1 ? "e1" : "e0";
}

// Checks if the hexadecimal string starts with any of the specified prefixes
function startsWithAny(hex: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => hex.startsWith(prefix));
}

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Hex string must have an even length");
  const byteArray = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    byteArray[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return byteArray;
}

export const hexToBech32 = (
  hex: string,
  prefix: "addr" | "stake",
  networkId = 1,
  isScript = false,
): string => {
  // Default to the input hex; modify only if needed
  let modifiedHex = hex;

  // Check if the hex string already starts with 'addr' or 'stake'
  if (startsWithAny(hex, ["addr", "stake"])) {
    return hex; // If it does, return the hex as is
  }

  // Append specific prefixes for stake addresses if necessary
  if (prefix === "stake" && !startsWithAny(hex, ["e0", "e1", "f0", "f1"])) {
    const toAppend = determinePrefixToAppend(networkId, isScript);
    modifiedHex = toAppend + hex;
  }

  const prfx = networkId === 1 ? prefix : `${prefix}_test`;

  const byteArray = hexToUint8Array(modifiedHex);
  const words = bech32.toWords(byteArray);
  return bech32.encode(prfx, words, 1000);
};
