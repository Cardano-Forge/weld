export function castArray<T>(obj: T | T[]): T[] {
  if (Array.isArray(obj)) {
    return obj;
  }
  return [obj];
}
