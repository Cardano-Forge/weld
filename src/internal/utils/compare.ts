// adapted from https://github.com/pmndrs/zustand/blob/main/src/vanilla/shallow.ts

export function compare<T>(objA: T, objB: T) {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
    return false;
  }

  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) return false;
    for (const [key, value] of objA) {
      if (!Object.is(value, objB.get(key))) {
        return false;
      }
    }
    return true;
  }

  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) return false;
    for (const value of objA) {
      if (!objB.has(value)) {
        return false;
      }
    }
    return true;
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) return false;
    for (let i = 0; i < objA.length; i++) {
      if (!Object.is(objA[i], objB[i])) {
        return false;
      }
    }
    return true;
  }

  const keysA = Object.keys(objA);

  if (keysA.length !== Object.keys(objB).length) {
    return false;
  }

  for (const keyA of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, keyA as string)) {
      return false;
    }

    const valueA = objA[keyA as keyof T];
    const valueB = objB[keyA as keyof T];

    if (!Object.is(valueA, valueB)) {
      return false;
    }
  }
  return true;
}
