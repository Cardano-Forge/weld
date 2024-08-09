import { expect, test } from "vitest";

import { hexToBech32 } from "./hex-to-bech32";
import type {
  ChangeAddressBech32,
  ChangeAddressHex,
  StakeAddressBech32,
  StakeAddressHex,
} from "./extensions";

const changeHexStripped =
  "69edbdd0d0a5fd7dfe0fced07630d03c2f9e9e5c0cd2071516774cb616432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const changeHexMain: ChangeAddressHex = `01${changeHexStripped}`;
const changeHexTest: ChangeAddressHex = `00${changeHexStripped}`;
const changeBechMain: ChangeAddressBech32 =
  "addr1q957m0ws6zjl6l07pl8dqa3s6q7zl857tsxdypc4zem5edskgv552vsywzgqyukhupc8qckzr4g2wqsmxl0tsssn4wrqt85etp";
const changeBechTest: ChangeAddressBech32 =
  "addr_test1qp57m0ws6zjl6l07pl8dqa3s6q7zl857tsxdypc4zem5edskgv552vsywzgqyukhupc8qckzr4g2wqsmxl0tsssn4wrqg3fe87";

const stakeHexStripped = "16432945320470900272d7e0707062c21d50a7021b37deb84213ab86";
const stakeHexTest: StakeAddressHex = `e0${stakeHexStripped}`;
const stakeHexMain: StakeAddressHex = `e1${stakeHexStripped}`;
const stakeBechMain: StakeAddressBech32 =
  "stake1uytyx229xgz8pyqzwtt7qursvtpp6598qgdn0h4cggf6hpshzjs4w";
const stakeBechTest: StakeAddressBech32 =
  "stake_test1uqtyx229xgz8pyqzwtt7qursvtpp6598qgdn0h4cggf6hpssgcj3n";

test("hexToBech32", () => {
  expect(hexToBech32(changeHexMain)).toBe(changeBechMain);
  expect(hexToBech32(stakeHexMain)).toBe(stakeBechMain);
  expect(hexToBech32(changeHexTest)).toBe(changeBechTest);
  expect(hexToBech32(stakeHexTest)).toBe(stakeBechTest);
});
