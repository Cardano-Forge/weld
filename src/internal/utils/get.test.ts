import { expect, test } from "vitest";
import { get } from "./get";

test("get", () => {
  expect(get(null, "test")).toBeUndefined();
  expect(get({}, "test")).toBeUndefined();
  expect(get({}, "")).toBeUndefined();
  expect(get({ a: "a" }, "")).toBeUndefined();
  expect(get({ a: "a" }, "a")).toBe("a");
  expect(get({ a: "a" }, "b")).toBeUndefined();
  expect(get({ a: "a" }, "a.b")).toBeUndefined();
  expect(get({ a: { b: "b" } }, "a.b")).toBe("b");
  expect(get({ a: { b: { c: "c" } } }, "a.b")).toEqual({ c: "c" });
  expect(get({ a: { b: { c: "c" } } }, "a.b.c")).toEqual("c");
  expect(get([{ a: "a" }, { b: "b" }], "0.a")).toEqual("a");
  expect(get([{ a: "a" }, { b: "b" }], "1.b")).toEqual("b");
});
