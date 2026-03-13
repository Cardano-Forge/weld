// adapted from https://github.com/pmndrs/zustand/blob/main/src/react/shallow.ts

import { useRef } from "react";
import { compare } from "@/internal/utils/compare";

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
