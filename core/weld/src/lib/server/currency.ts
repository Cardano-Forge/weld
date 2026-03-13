export function adaToLovelace(ada: number): number {
  return ada * 1_000_000;
}

export function lovelaceToAda(lovelace: number): number {
  return lovelace / 1_000_000;
}
