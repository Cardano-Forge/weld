import { isChangeAddressHex, isStakeAddressHex } from "./extensions";

export function stripAddressPrefix(input: string): string;
export function stripAddressPrefix(input?: string | null): string | undefined;
export function stripAddressPrefix(input?: string | null): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  if (isStakeAddressHex(input) || isChangeAddressHex(input)) {
    return input.slice(2);
  }
  return input;
}
