import { describe, expect, spyOn, test } from "bun:test";
import jsonLogic from "../src/logic";
import appliesTests from "./appliesTests.js";
import rule_likeTests from "./rule_likeTests.js";

describe("apply()", () => {
  for (const t of appliesTests) {
    const [rule, data, expected] = t;
    test(`jsonLogic.apply(${t
      .map((m) => JSON.stringify(m))
      .join(", ")}) === ${JSON.stringify(expected)}`, function () {
      if (
        (typeof data === "number" && typeof expected === "number") ||
        (typeof data === "string" && typeof expected === "string") ||
        (typeof data === "boolean" && typeof expected === "boolean")
      ) {
        expect(jsonLogic.apply(rule, data)).toBe(expected);
      }
      expect(jsonLogic.apply(rule, data)).toEqual(expected);
    });
  }
});

describe("rule_like()", () => {
  for (const t of rule_likeTests) {
    const [rule, data, expected] = t;
    test(`jsonLogic.rule_like(${t
      .map((m) => JSON.stringify(m))
      .join(", ")}) === ${JSON.stringify(expected)}`, () => {
      expect(jsonLogic.rule_like(rule, data)).toEqual(expected);
    });
  }
});

test("Bad operator", () => {
  expect(() => jsonLogic.apply({ fubar: [] })).toThrow(
    /Unrecognized operation/
  );
  expect(() => jsonLogic.apply({ 'fubar.rabuf': [] })).toThrow(
    /Unrecognized operation/
  );
});

describe("edge cases", () => {
  test("Called with no arguments", () => {
    expect(jsonLogic.apply()).toBeUndefined();
  });
  test("var when data is falsy", () => {
    expect(jsonLogic.apply({ var: "" }, 0)).toBe(0);
  });
  test("var when data is null", () => {
    expect(jsonLogic.apply({ var: "" }, null)).toBeNull();
  });
  test("var when data is undefined", () => {
    expect(jsonLogic.apply({ var: "" }, undefined)).toBeUndefined();
  });
  test("Fallback works when data is a non-object", () => {
    expect(jsonLogic.apply({ var: ["a", "fallback"] }, undefined)).toBe(
      "fallback"
    );
  });
});

test("logging", () => {
  let last_console: any;
  const cnsllg = spyOn(console, "log");
  cnsllg.mockImplementation((logged) => {
    last_console = logged;
  });
  expect(jsonLogic.apply({ log: [1] })).toBe(1);
  expect(last_console).toBe(1);
});

test("Expanding functionality with add_operator", () => {
  // Operator is not yet defined
  expect(() => jsonLogic.apply({ add_to_a: [] })).toThrow(
    /Unrecognized operation/
  );

  // Set up some outside data, and build a basic function operator
  let a = 0;
  const add_to_a = (b?: number) => (a += b === undefined ? 1 : b);

  jsonLogic.add_operation("add_to_a", add_to_a);
  // New operation executes, returns desired result
  // No args
  expect(jsonLogic.apply({ add_to_a: [] })).toBe(1);
  // Unary syntactic sugar
  expect(jsonLogic.apply({ add_to_a: 41 })).toBe(42);
  // New operation had side effects.
  expect(a).toBe(42);

  const fives = {
    add: (i: number) => i + 5,
    subtract: (i: number) => i - 5,
  };

  jsonLogic.add_operation("fives", fives);
  expect(jsonLogic.apply({ "fives.add": 37 })).toBe(42);
  expect(jsonLogic.apply({ "fives.subtract": [47] })).toBe(42);

  // Calling a method with multiple var as arguments.
  jsonLogic.add_operation("times", (a: number, b: number) => a * b);
  expect(
    jsonLogic.apply({ times: [{ var: "a" }, { var: "b" }] }, { a: 6, b: 7 })
  ).toBe(42);

  // Remove operation:
  jsonLogic.rm_operation("times");

  expect(() => jsonLogic.apply({ times: [2, 2] })).toThrow(
    /Unrecognized operation/
  );

  // Calling a method that takes an array, but the inside of the array has rules, too
  jsonLogic.add_operation("array_times", (a: number[]) => a[0] * a[1]);
  expect(
    jsonLogic.apply(
      { array_times: [[{ var: "a" }, { var: "b" }]] },
      { a: 6, b: 7 }
    )
  ).toBe(42);
});

test("Control structures don't eval depth-first", () => {
  // Depth-first recursion was wasteful but not harmful until we added custom operations that could have side-effects.

  // If operations run the condition, if truthy, test runs and returns that consequent.
  // Consequents of falsy conditions should not run.
  // After one truthy condition, no other condition should run
  let conditions: any[] = [];
  let consequents: any[] = [];
  jsonLogic.add_operation("push.if", (v: any) => {
    conditions.push(v);
    return v;
  });
  jsonLogic.add_operation("push.then", (v: any) => {
    consequents.push(v);
    return v;
  });
  jsonLogic.add_operation("push.else", (v: any) => {
    consequents.push(v);
    return v;
  });

  jsonLogic.apply({
    if: [
      { "push.if": [true] },
      { "push.then": ["first"] },
      { "push.if": [false] },
      { "push.then": ["second"] },
      { "push.else": ["third"] },
    ],
  });
  expect(conditions).toEqual([true]);
  expect(consequents).toEqual(["first"]);

  conditions = [];
  consequents = [];
  jsonLogic.apply({
    if: [
      { "push.if": [false] },
      { "push.then": ["first"] },
      { "push.if": [true] },
      { "push.then": ["second"] },
      { "push.else": ["third"] },
    ],
  });
  expect(conditions).toEqual([false, true]);
  expect(consequents).toEqual(["second"]);

  conditions = [];
  consequents = [];
  jsonLogic.apply({
    if: [
      { "push.if": [false] },
      { "push.then": ["first"] },
      { "push.if": [false] },
      { "push.then": ["second"] },
      { "push.else": ["third"] },
    ],
  });
  expect(conditions).toEqual([false, false]);
  expect(consequents).toEqual(["third"]);

  jsonLogic.add_operation("push", function (arg: any) {
    i.push(arg);
    return arg;
  });

  let i: any[];

  i = [];
  jsonLogic.apply({ and: [{ push: [false] }, { push: [false] }] });
  expect(i).toEqual([false]);
  i = [];
  jsonLogic.apply({ and: [{ push: [false] }, { push: [true] }] });
  expect(i).toEqual([false]);
  i = [];
  jsonLogic.apply({ and: [{ push: [true] }, { push: [false] }] });
  expect(i).toEqual([true, false]);
  i = [];
  jsonLogic.apply({ and: [{ push: [true] }, { push: [true] }] });
  expect(i).toEqual([true, true]);

  i = [];
  jsonLogic.apply({ or: [{ push: [false] }, { push: [false] }] });
  expect(i).toEqual([false, false]);
  i = [];
  jsonLogic.apply({ or: [{ push: [false] }, { push: [true] }] });
  expect(i).toEqual([false, true]);
  i = [];
  jsonLogic.apply({ or: [{ push: [true] }, { push: [false] }] });
  expect(i).toEqual([true]);
  i = [];
  jsonLogic.apply({ or: [{ push: [true] }, { push: [true] }] });
  expect(i).toEqual([true]);
});
