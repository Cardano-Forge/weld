export function entries<TKey extends string | number | symbol, TVal>(obj: Record<TKey, TVal>) {
  return Object.entries(obj) as [TKey, TVal][];
}
