import { startsWithAny } from "@/internal/utils/starts-with-any";

const stakeAddressHexLength = 58;
const stakeAddressHexPrefixes = ["e0", "e1"] as const;
type StakeAddressHexPrefix = (typeof stakeAddressHexPrefixes)[number];

const changeAddressHexLength = 116;
const changeAddressHexPrefixes = ["00", "01"] as const;
type ChangeAddressHexPrefix = (typeof changeAddressHexPrefixes)[number];

export function isStakeAddressHex(input?: string): input is StakeAddressHex {
  return (
    !!input &&
    input.length === stakeAddressHexLength &&
    startsWithAny(input, stakeAddressHexPrefixes)
  );
}

export function isChangeAddressHex(input?: string): input is ChangeAddressHex {
  return (
    !!input &&
    input.length === changeAddressHexLength &&
    startsWithAny(input, changeAddressHexPrefixes)
  );
}

export type AddressHex = `${ChangeAddressHexPrefix | StakeAddressHexPrefix}${string}`;
export type ChangeAddressHex = `${ChangeAddressHexPrefix}${string}`;
export type StakeAddressHex = `${StakeAddressHexPrefix}${string}`;

const stakeAddressBech32Prefixes = ["stake", "stake_test"] as const;
export type StakeAddressBech32Prefix = (typeof stakeAddressBech32Prefixes)[number];

const changeAddressBech32Prefixes = ["addr", "addr_test"] as const;
export type ChangeAddressBech32Prefix = (typeof changeAddressBech32Prefixes)[number];

export type AddressBech32 = `${StakeAddressBech32Prefix | ChangeAddressBech32Prefix}${string}`;
export type ChangeAddressBech32 = `${ChangeAddressBech32Prefix}${string}`;
export type StakeAddressBech32 = `${StakeAddressBech32Prefix}${string}`;
