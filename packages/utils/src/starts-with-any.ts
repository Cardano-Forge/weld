export function startsWithAny(str: string, prefixes: string[] | readonly string[]): boolean {
  for (const prefix of prefixes) {
    if (str.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}
