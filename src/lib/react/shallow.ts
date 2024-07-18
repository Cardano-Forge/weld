// src: https://github.com/pmndrs/zustand/blob/main/src/react/shallow.ts

import { shallow } from "@/internal/shallow";
import { useRef } from "react";

export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U>();
  return (state) => {
    const next = selector(state);
    if (!shallow(prev.current, next)) {
      prev.current = next;
    }
    return prev.current as U;
  };
}
