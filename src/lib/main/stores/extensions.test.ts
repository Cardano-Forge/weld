import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifeCycleManager } from "@/internal/lifecycle";
import { createExtensionsStore } from "./extensions";

const lifecycle = new LifeCycleManager();

const setupAutoUpdateStopSpy = vi.hoisted(() => vi.fn());
const setupAutoUpdateSpy = vi.hoisted(() => vi.fn());
vi.mock("@/internal/auto-update", () => ({
  setupAutoUpdate: (fct: (stop: () => void) => void, ...params: unknown[]) => {
    setupAutoUpdateSpy(fct, ...params);
    const handler = () => fct(setupAutoUpdateStopSpy);
    window.addEventListener("focus", handler);
    lifecycle.subscriptions.add(() => {
      window.removeEventListener("focus", handler);
    });
    return { stop: setupAutoUpdateStopSpy };
  },
}));

beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: For testing purposes
  (window as any).cardano = {
    nami: {},
  };
  vi.resetAllMocks();
  setupAutoUpdateStopSpy.mockReset();
  setupAutoUpdateSpy.mockReset();
});

afterEach(() => {
  lifecycle.cleanup();
});

describe("updateExtensions", () => {
  it("should save valid extensions", () => {});

  it("should extensions that are not installed", () => {});

  it("should ignore invalid extensions", () => {});

  it("should always return the same objects when caching is enabled", () => {});

  it("should always return the new objects when caching is disabled", () => {});
});

describe("init", () => {
  it("should update extensions", () => {});

  it("should setup auto updates", () => {});
});

describe("cleanup", () => {
  it("should cleanup the lifecycle", () => {
    vi.spyOn(lifecycle, "cleanup");
    const store = createExtensionsStore({ lifecycle });
    store.cleanup();
    expect(lifecycle.cleanup).toHaveBeenCalledOnce();
  });
});
