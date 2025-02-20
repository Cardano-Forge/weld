import { expect, test } from "vitest";

import { type ParsedBalance, decodeBalance, parseBalance } from "./balance";

const testCases = {
  preprod: {
    encoded:
      "821b00000002600e94fba1581c698a6ea0ca99f315034072af31eaac6ec11fe8558d3f48e9775aab9da14574445249501a00120f77",
    parsed: {
      cardano: { lovelace: 10201502971 },
      "698a6ea0ca99f315034072af31eaac6ec11fe8558d3f48e9775aab9d": { "7444524950": 1183607 },
    },
  },
  mainnet: {
    encoded:
      "821a041fa96ea7581c19f4f7ff228bb1f98fc86280597cce31effe277762ab20fa0decea54a24d486f6d657250756e6b73313030014e486f6d657250756e6b733130303701581c1af660e4c58514a2f0ea167deca340381e55bed4aea60bc09c211417ad4d416e76696c5465737431303736014d416e76696c5465737431323733014d416e76696c5465737431353232014d416e76696c5465737432303531014d416e76696c5465737432333731014d416e76696c5465737432343436014d416e76696c5465737432343933014d416e76696c5465737432353835014d416e76696c5465737432353935014d416e76696c5465737432363130014d416e76696c5465737432363432014d416e76696c5465737432363837014d416e76696c546573743237393101581c3d250a78df7ad14e9472d9b63159ef2d099740c593c0ba53059f144aa152456e6c69676874656e6d696e74303937313801581c8c6403b2057eb05cfe2cebd623cb70afc38705b51d6ae90395ac80d7a24b4765726f5069786c303131014b4765726f5069786c30313401581c8f80ebfaf62a8c33ae2adf047572604c74db8bc1daba2b43f9a65635a15243617264616e6f57617272696f723632323201581ca12177cfaa9993918c864b46e5ba5113b4d5078b9f9d4b1dcfb9761ea14d416e76696c546573743031303101581cfc08aff43685ca4d5536a0a6c006c724ab37fcc41eb06940ee8b62dfa14c53776565744b65793539363901",
    parsed: {
      cardano: { lovelace: 69183854 },
      "19f4f7ff228bb1f98fc86280597cce31effe277762ab20fa0decea54": {
        "486f6d657250756e6b73313030": 1,
        "486f6d657250756e6b7331303037": 1,
      },
      "1af660e4c58514a2f0ea167deca340381e55bed4aea60bc09c211417": {
        "416e76696c5465737431303736": 1,
        "416e76696c5465737431323733": 1,
        "416e76696c5465737431353232": 1,
        "416e76696c5465737432303531": 1,
        "416e76696c5465737432333731": 1,
        "416e76696c5465737432343436": 1,
        "416e76696c5465737432343933": 1,
        "416e76696c5465737432353835": 1,
        "416e76696c5465737432353935": 1,
        "416e76696c5465737432363130": 1,
        "416e76696c5465737432363432": 1,
        "416e76696c5465737432363837": 1,
        "416e76696c5465737432373931": 1,
      },
      "3d250a78df7ad14e9472d9b63159ef2d099740c593c0ba53059f144a": {
        "456e6c69676874656e6d696e743039373138": 1,
      },
      "8c6403b2057eb05cfe2cebd623cb70afc38705b51d6ae90395ac80d7": {
        "4765726f5069786c303131": 1,
        "4765726f5069786c303134": 1,
      },
      "8f80ebfaf62a8c33ae2adf047572604c74db8bc1daba2b43f9a65635": {
        "43617264616e6f57617272696f7236323232": 1,
      },
      a12177cfaa9993918c864b46e5ba5113b4d5078b9f9d4b1dcfb9761e: { "416e76696c5465737430313031": 1 },
      fc08aff43685ca4d5536a0a6c006c724ab37fcc41eb06940ee8b62df: { "53776565744b657935393639": 1 },
    },
  },
  noAssets: {
    encoded: "1a017d7840",
    parsed: {
      cardano: { lovelace: 25_000_000 },
    },
  },
  empty: {
    encoded: "00",
    parsed: {
      cardano: { lovelace: 0 },
    },
  },
} satisfies Record<string, { encoded: string; parsed: ParsedBalance }>;

test("decode balance", () => {
  expect(Array.isArray(decodeBalance(testCases.preprod.encoded))).toBe(true);
  expect(Array.isArray(decodeBalance(testCases.mainnet.encoded))).toBe(true);
  expect(decodeBalance(testCases.noAssets.encoded)).toBe(25_000_000);
  expect(decodeBalance(testCases.empty.encoded)).toBe(0);
});

for (const [name, { encoded, parsed }] of Object.entries(testCases)) {
  test(`parse encoded [${name}]`, () => {
    expect(parseBalance(encoded)).toStrictEqual(parsed);
  });
  test(`parse decoded [${name}]`, () => {
    expect(parseBalance(decodeBalance(encoded))).toStrictEqual(parsed);
  });
  test(`parse with lovelace filter [${name}]`, () => {
    expect(parseBalance(encoded, "lovelace")).toStrictEqual(parsed.cardano.lovelace);
  });
  test(`parse with policy filter [${name}]`, () => {
    const policyId = "19f4f7ff228bb1f98fc86280597cce31effe277762ab20fa0decea54";
    const expected = parsed[policyId as keyof typeof parsed] ?? {};
    expect(parseBalance(encoded, policyId)).toStrictEqual(expected);
  });
  test(`parse with asset filter [${name}]`, () => {
    const policyId = "8c6403b2057eb05cfe2cebd623cb70afc38705b51d6ae90395ac80d7";
    const assetName = "4765726f5069786c303134";
    const expectedAssets = parsed[policyId as keyof typeof parsed] ?? {};
    const expected = expectedAssets[assetName as keyof typeof expectedAssets] ?? 0;
    expect(parseBalance(encoded, { policyId, assetName })).toStrictEqual(expected);
  });
}
