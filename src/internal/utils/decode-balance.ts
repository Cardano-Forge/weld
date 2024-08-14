import { hexToArrayBuffer } from "@/internal/utils/hex-to-array-buffer";
import type { Cbor } from "@/lib/main";
import { decode as decodeCbor } from "cbor-js";

export function decodeBalance(balanceCbor: Cbor) {
  const decoded: unknown = decodeCbor(hexToArrayBuffer(balanceCbor));
  if (typeof decoded === "number") {
    return decoded;
  }

  if (Array.isArray(decoded)) {
    const lovelace: unknown = decoded[0];
    if (typeof lovelace === "number") {
      return lovelace;
    }
  }

  return 0;
}
