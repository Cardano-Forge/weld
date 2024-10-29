export type WeldStorage = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export const defaultStorage: WeldStorage = {
  get(key) {
    try {
      const arr = document?.cookie?.split("; ") ?? [];
      for (const str of arr) {
        const [k, v] = str.split("=");
        if (k === key) {
          return v || undefined;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  },
  set(key, value) {
    const exp = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
    document.cookie = `${key}=${value}; expires=${exp.toUTCString()}; path=/;`;
  },
  remove(key) {
    document.cookie = `${key}=; expires=${new Date(0).toUTCString()}; path=/;`;
  },
};
