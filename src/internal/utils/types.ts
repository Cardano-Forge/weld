// biome-ignore lint/suspicious/noExplicitAny: It's any function, safe to use any
export type AnyFunction = (...params: any[]) => any;

export type PartialWithDiscriminant<
  TType,
  TDiscriminantKey extends string,
  TKeys extends keyof TType = keyof TType,
> =
  | { [TKey in TKeys]: TKey extends TDiscriminantKey ? true : TType[TKey] }
  | { [TKey in TKeys]: TKey extends TDiscriminantKey ? false : TType[TKey] | undefined };

export type Modify<T, U> = Omit<T, keyof U> & U;

export type MaybePromise<T> = T | Promise<T>;

export type Prettify<T> = { [TKey in keyof T]: T[TKey] } & {};
