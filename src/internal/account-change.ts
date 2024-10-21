import { getFailureReason } from "@/internal/utils/errors";
import { WalletDisconnectAccountError } from "@/lib/main";
import type { MaybePromise } from "./utils/types";

function defaultIsAccountChangeError(error: unknown): error is Error {
  return getFailureReason(error) === "account changed";
}

export function handleAccountChangeErrors<T extends Record<string, unknown>>(
  enabledApi: T,
  updateEnabledApi: () => MaybePromise<T>,
  isApiEnabled: () => MaybePromise<boolean>,
  { isAccountChangeError = defaultIsAccountChangeError } = {},
): T {
  const proxy = new Proxy(enabledApi, {
    get(target, p: string, receiver: T) {
      const value: unknown = target[p];

      if (typeof value !== "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return Reflect.get(target, p, receiver);
      }

      // biome-ignore lint/suspicious/noExplicitAny: We don't care about the param types here
      return (...params: any[]) => {
        const res: unknown = value.apply(target, params);
        if (!(res instanceof Promise)) {
          return res;
        }
        return res.catch(async (error) => {
          if (isAccountChangeError(error)) {
            const updatedApi = await updateEnabledApi();
            const newValue: unknown = updatedApi[p];
            if (typeof newValue !== "function") {
              throw error;
            }

            const newRes: unknown = await newValue.apply(target, params);
            return newRes;
          }

          const isEnabled = await isApiEnabled();
          if (!isEnabled) {
            throw new WalletDisconnectAccountError();
          }

          throw error;
        });
      };
    },
  });

  return proxy;
}
