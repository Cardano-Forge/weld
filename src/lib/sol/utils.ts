import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function lamportToSol(lamport: number): number {
  return lamport / LAMPORTS_PER_SOL;
}

export function solToLamport(sol: number): number {
  return sol * LAMPORTS_PER_SOL;
}
