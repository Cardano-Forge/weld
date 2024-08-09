import { expect, test } from "vitest";

import { ensurePrefix, hexToBech32, stripPrefix } from "./hex-to-bech32";

const baseHexMainnet =
  "0169edbdd0d0a5fd7dfe0fced07630d03c2f9e9e5c0cd2071516774cb616432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const baseHexTestnet =
  "0069edbdd0d0a5fd7dfe0fced07630d03c2f9e9e5c0cd2071516774cb616432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const baseBechMainnet =
  "addr1q957m0ws6zjl6l07pl8dqa3s6q7zl857tsxdypc4zem5edskgv552vsywzgqyukhupc8qckzr4g2wqsmxl0tsssn4wrqt85etp";
const baseBechTestnet =
  "addr_test1qp57m0ws6zjl6l07pl8dqa3s6q7zl857tsxdypc4zem5edskgv552vsywzgqyukhupc8qckzr4g2wqsmxl0tsssn4wrqg3fe87";

const stakeHexTestnet = "e016432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const stakeHexMainnet = "e116432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const stakeHexStripped = "16432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const stakeBechMainnet = "stake1uytyx229xgz8pyqzwtt7qursvtpp6598qgdn0h4cggf6hpshzjs4w";
const stakeBechTestnet = "stake_test1uqtyx229xgz8pyqzwtt7qursvtpp6598qgdn0h4cggf6hpssgcj3n";

const badAddress = "bad";

test("stripPrefix", () => {
  expect(stripPrefix(baseHexMainnet)).toBe(baseHexMainnet);
  expect(stripPrefix(baseHexTestnet)).toBe(baseHexTestnet);
  expect(stripPrefix(baseBechMainnet)).toBe(baseBechMainnet);
  expect(stripPrefix(stakeHexTestnet)).toBe(stakeHexStripped);
  expect(stripPrefix(stakeHexMainnet)).toBe(stakeHexStripped);
  expect(stripPrefix(stakeHexStripped)).toBe(stakeHexStripped);
  expect(stripPrefix(stakeBechMainnet)).toBe(stakeBechMainnet);
  expect(stripPrefix(badAddress)).toBe(badAddress);
});

test("ensurePrefix", () => {
  expect(ensurePrefix(baseHexMainnet, 1)).toBe(baseHexMainnet);
  expect(ensurePrefix(baseHexTestnet, 1)).toBe(baseHexTestnet);
  expect(ensurePrefix(baseBechMainnet, 1)).toBe(baseBechMainnet);
  expect(ensurePrefix(stakeHexTestnet, 1)).toBe(stakeHexTestnet);
  expect(ensurePrefix(stakeHexMainnet, 1)).toBe(stakeHexMainnet);
  expect(ensurePrefix(stakeHexStripped, 1)).toBe(stakeHexMainnet);
  expect(ensurePrefix(stakeBechMainnet, 1)).toBe(stakeBechMainnet);
  expect(ensurePrefix(badAddress, 1)).toBe(badAddress);
  expect(ensurePrefix(baseHexMainnet, 0)).toBe(baseHexMainnet);
  expect(ensurePrefix(baseHexTestnet, 0)).toBe(baseHexTestnet);
  expect(ensurePrefix(baseBechMainnet, 0)).toBe(baseBechMainnet);
  expect(ensurePrefix(stakeHexTestnet, 0)).toBe(stakeHexTestnet);
  expect(ensurePrefix(stakeHexMainnet, 0)).toBe(stakeHexMainnet);
  expect(ensurePrefix(stakeHexStripped, 0)).toBe(stakeHexTestnet);
  expect(ensurePrefix(stakeBechMainnet, 0)).toBe(stakeBechMainnet);
  expect(ensurePrefix(badAddress, 0)).toBe(badAddress);
});

test("hexToBech32", () => {
  expect(hexToBech32(baseHexMainnet, 1)).toBe(baseBechMainnet);
  expect(hexToBech32(baseBechMainnet, 1)).toBe(baseBechMainnet);
  expect(hexToBech32(stakeHexMainnet, 1)).toBe(stakeBechMainnet);
  expect(hexToBech32(stakeHexStripped, 1)).toBe(stakeBechMainnet);
  expect(hexToBech32(stakeBechMainnet, 1)).toBe(stakeBechMainnet);
  expect(hexToBech32(baseHexTestnet, 0)).toBe(baseBechTestnet);
  expect(hexToBech32(stakeHexTestnet, 0)).toBe(stakeBechTestnet);
  expect(hexToBech32(stakeHexStripped, 0)).toBe(stakeBechTestnet);
  expect(hexToBech32(stakeBechMainnet, 0)).toBe(stakeBechMainnet);
});
