import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function lamportToSol(lamport: number | bigint | string): bigint {
  return BigInt(lamport) / BigInt(LAMPORTS_PER_SOL);
}

export function solToLamport(sol: number | bigint | string): bigint {
  return BigInt(sol) * BigInt(LAMPORTS_PER_SOL);
}
