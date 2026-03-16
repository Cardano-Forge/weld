export const SATS_PER_BTC = 100_000_000;

export function satToBtc(satoshis: number): number {
  return satoshis / SATS_PER_BTC;
}

export function btcToSat(btc: number): number {
  return btc * SATS_PER_BTC;
}
