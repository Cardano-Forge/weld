import { WalletDisconnectAccountError } from "@/lib/main/utils";
import { describe, expect, it, vi } from "vitest";
import { handleAccountChangeErrors } from "./account-change";

type Api = {
  info: {
    name: string;
    balance: number;
  };
  getBalance(): number;
  getBalanceAsync(): Promise<number>;
};

function newApi(
  info: Api["info"],
  opts: { throws: "account-change-error" | "other-error" | false },
): Api {
  return {
    info,
    getBalance: vi.fn(() => {
      if (opts.throws === "account-change-error") {
        throw new TestAccountChangeError();
      }
      if (opts.throws === "other-error") {
        throw new Error("other error");
      }
      return info.balance;
    }),
    getBalanceAsync: vi.fn(async () => {
      return new Promise<number>((resolve, reject) => {
        if (opts.throws === "account-change-error") {
          reject(new TestAccountChangeError());
        } else if (opts.throws === "other-error") {
          reject(new Error("other error"));
        } else {
          resolve(info.balance);
        }
      });
    }),
  };
}

class TestAccountChangeError extends Error {
  constructor() {
    super("account changed");
    this.name = "Anvil Weld - TestAccountChangeError";
  }
}

describe("handleAccountChangeErrors", () => {
  it("should reflect non-fct properties as is", () => {
    const api = newApi({ balance: 100, name: "jack" }, { throws: false });
    const updateApi = vi.fn(() => newApi({ balance: 100, name: "jack" }, { throws: false }));
    const isApiEnabled = vi.fn(() => true);
    const wrappedApi = handleAccountChangeErrors(api, updateApi, isApiEnabled);
    expect(wrappedApi.info).toBe(api.info);
  });

  it("should call fct properties normally", () => {
    const api = newApi({ balance: 100, name: "jack" }, { throws: false });
    const updateApi = vi.fn(() => newApi({ balance: 100, name: "jack" }, { throws: false }));
    const isApiEnabled = vi.fn(() => true);
    const wrappedApi = handleAccountChangeErrors(api, updateApi, isApiEnabled);
    expect(wrappedApi.getBalance()).toBe(api.info.balance);
    expect(wrappedApi.getBalanceAsync()).resolves.toBe(api.info.balance);
    expect(api.getBalance).toHaveBeenCalledOnce();
    expect(api.getBalanceAsync).toHaveBeenCalledOnce();
  });

  it("should try to update the api when account change error is thrown by an async fct", () => {
    const api = newApi({ balance: 100, name: "jack" }, { throws: "account-change-error" });
    const updatedApi = newApi({ balance: 500, name: "john" }, { throws: false });
    const updateApi = vi.fn(() => updatedApi);
    const isApiEnabled = vi.fn(() => true);
    const wrappedApi = handleAccountChangeErrors(api, updateApi, isApiEnabled);
    expect(() => api.getBalance()).toThrow(TestAccountChangeError);
    expect(() => wrappedApi.getBalance()).toThrow(TestAccountChangeError);
    expect(() => api.getBalanceAsync()).rejects.toThrow(TestAccountChangeError);
    expect(wrappedApi.getBalanceAsync()).resolves.toBe(updatedApi.info.balance);
  });

  it("should only retry once", () => {
    const api = newApi({ balance: 100, name: "jack" }, { throws: "account-change-error" });
    let updateCount = 0;
    const updateApi = vi.fn(() => {
      if (++updateCount === 1) {
        return newApi({ balance: 100, name: "jack" }, { throws: "account-change-error" });
      }
      return newApi({ balance: 100, name: "jack" }, { throws: false });
    });
    const isApiEnabled = vi.fn(() => true);
    const wrappedApi = handleAccountChangeErrors(api, updateApi, isApiEnabled);
    expect(() => api.getBalance()).toThrow(TestAccountChangeError);
    expect(() => wrappedApi.getBalance()).toThrow(TestAccountChangeError);
    expect(() => api.getBalanceAsync()).rejects.toThrow(TestAccountChangeError);
    expect(() => wrappedApi.getBalanceAsync()).rejects.toThrow(TestAccountChangeError);
  });

  it("should reflect other errors", () => {
    const api = newApi({ balance: 100, name: "jack" }, { throws: "other-error" });
    const updateApi = vi.fn(() => {
      return newApi({ balance: 100, name: "jack" }, { throws: false });
    });
    const isApiEnabled = vi.fn(() => true);
    const wrappedApi = handleAccountChangeErrors(api, updateApi, isApiEnabled);
    expect(() => api.getBalance()).toThrow("other error");
    expect(() => wrappedApi.getBalance()).toThrow("other error");
    expect(() => api.getBalanceAsync()).rejects.toThrow("other error");
    expect(() => wrappedApi.getBalanceAsync()).rejects.toThrow("other error");
  });

  it("should transform error into WalletDisconnectAccountError when and error other than account changed is thrown by an async fct and the api is not enabled", () => {
    const api = newApi({ balance: 100, name: "jack" }, { throws: "other-error" });
    const updateApi = vi.fn(() => {
      return newApi({ balance: 100, name: "jack" }, { throws: false });
    });
    const isApiEnabled = vi.fn(() => false);
    const wrappedApi = handleAccountChangeErrors(api, updateApi, isApiEnabled);
    expect(() => api.getBalance()).toThrow("other error");
    expect(() => wrappedApi.getBalance()).toThrow("other error");
    expect(() => api.getBalanceAsync()).rejects.toThrow("other error");
    expect(() => wrappedApi.getBalanceAsync()).rejects.toThrow(WalletDisconnectAccountError);
  });
});
