import { isChangeAddressHex, isStakeAddressHex } from "./extensions";

export function stripAddressPrefix(input: string): string {
  if (isStakeAddressHex(input) || isChangeAddressHex(input)) {
    return input.slice(2);
  }
  return input;
}
