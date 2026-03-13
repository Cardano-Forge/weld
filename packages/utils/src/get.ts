export function get(obj: unknown, path: string): unknown {
  const [firstKey, ...otherKeys] = path.split(".");
  if (typeof obj !== "object" || obj === null || !(firstKey in obj)) {
    return undefined;
  }
  const curr = obj[firstKey as keyof typeof obj];
  if (otherKeys.length === 0) {
    return curr;
  }
  return get(curr, otherKeys.join("."));
}
