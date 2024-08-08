export function identity<T, U = T>(value?: T): U {
  return value as U;
}
