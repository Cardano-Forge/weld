export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const UNSAFE_LIB_USAGE_ERROR =
  "Anvil Weld relies on DOM APIs and may produce unpredictable results if used outside of a browser environment.";
