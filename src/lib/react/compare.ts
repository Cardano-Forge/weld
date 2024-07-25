// adapted from https://github.com/pmndrs/zustand/blob/main/src/react/shallow.ts

import { compare } from "@/internal/compare";
import { useRef } from "react";

export function useCompare<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U>();
  return (state) => {
    const next = selector(state);
    if (!compare(prev.current, next)) {
      prev.current = next;
    }
    return prev.current as U;
  };
}
