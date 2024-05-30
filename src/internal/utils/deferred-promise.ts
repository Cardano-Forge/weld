import { identity } from "@/internal/utils/identity";

export function deferredPromise<T = void, R = unknown>() {
  let resolve: (value: T | PromiseLike<T>) => void = identity;
  let reject: (reason?: R) => void = identity;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
