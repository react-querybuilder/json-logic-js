import { describe, expect, spyOn, test } from "bun:test";
import { jsonLogic } from "./logic.js";

// Original source: https://jsonlogic.com/tests.json
const appliesTests = [
  // Non-rules get passed through
  [true, {}, true],
  [false, {}, false],
  [17, {}, 17],
  [3.14, {}, 3.14],
  ["apple", {}, "apple"],
  [null, {}, null],
  [["a", "b"], {}, ["a", "b"]],

  // Single operator tests
  [{ "==": [1, 1] }, {}, true],
  [{ "==": [1, "1"] }, {}, true],
  [{ "==": [1, 2] }, {}, false],
  [{ "===": [1, 1] }, {}, true],
  [{ "===": [1, "1"] }, {}, false],
  [{ "===": [1, 2] }, {}, false],
  [{ "!=": [1, 2] }, {}, true],
  [{ "!=": [1, 1] }, {}, false],
  [{ "!=": [1, "1"] }, {}, false],
  [{ "!==": [1, 2] }, {}, true],
  [{ "!==": [1, 1] }, {}, false],
  [{ "!==": [1, "1"] }, {}, true],
  [{ ">": [2, 1] }, {}, true],
  [{ ">": [1, 1] }, {}, false],
  [{ ">": [1, 2] }, {}, false],
  [{ ">": ["2", 1] }, {}, true],
  [{ ">=": [2, 1] }, {}, true],
  [{ ">=": [1, 1] }, {}, true],
  [{ ">=": [1, 2] }, {}, false],
  [{ ">=": ["2", 1] }, {}, true],
  [{ "<": [2, 1] }, {}, false],
  [{ "<": [1, 1] }, {}, false],
  [{ "<": [1, 2] }, {}, true],
  [{ "<": ["1", 2] }, {}, true],
  [{ "<": [1, 2, 3] }, {}, true],
  [{ "<": [1, 1, 3] }, {}, false],
  [{ "<": [1, 4, 3] }, {}, false],
  [{ "<=": [2, 1] }, {}, false],
  [{ "<=": [1, 1] }, {}, true],
  [{ "<=": [1, 2] }, {}, true],
  [{ "<=": ["1", 2] }, {}, true],
  [{ "<=": [1, 2, 3] }, {}, true],
  [{ "<=": [1, 4, 3] }, {}, false],
  [{ "!": [false] }, {}, true],
  [{ "!": false }, {}, true],
  [{ "!": [true] }, {}, false],
  [{ "!": true }, {}, false],
  [{ "!": 0 }, {}, true],
  [{ "!": 1 }, {}, false],
  [{ or: [true, true] }, {}, true],
  [{ or: [false, true] }, {}, true],
  [{ or: [true, false] }, {}, true],
  [{ or: [false, false] }, {}, false],
  [{ or: [false, false, true] }, {}, true],
  [{ or: [false, false, false] }, {}, false],
  [{ or: [false] }, {}, false],
  [{ or: [true] }, {}, true],
  [{ or: [1, 3] }, {}, 1],
  [{ or: [3, false] }, {}, 3],
  [{ or: [false, 3] }, {}, 3],
  [{ and: [true, true] }, {}, true],
  [{ and: [false, true] }, {}, false],
  [{ and: [true, false] }, {}, false],
  [{ and: [false, false] }, {}, false],
  [{ and: [true, true, true] }, {}, true],
  [{ and: [true, true, false] }, {}, false],
  [{ and: [false] }, {}, false],
  [{ and: [true] }, {}, true],
  [{ and: [1, 3] }, {}, 3],
  [{ and: [3, false] }, {}, false],
  [{ and: [false, 3] }, {}, false],
  [{ "?:": [true, 1, 2] }, {}, 1],
  [{ "?:": [false, 1, 2] }, {}, 2],
  [{ in: ["Bart", ["Bart", "Homer", "Lisa", "Marge", "Maggie"]] }, {}, true],
  [
    { in: ["Milhouse", ["Bart", "Homer", "Lisa", "Marge", "Maggie"]] },
    {},
    false,
  ],
  [{ in: ["Spring", "Springfield"] }, {}, true],
  [{ in: ["i", "team"] }, {}, false],
  [{ cat: "ice" }, {}, "ice"],
  [{ cat: ["ice"] }, {}, "ice"],
  [{ cat: ["ice", "cream"] }, {}, "icecream"],
  [{ cat: [1, 2] }, {}, "12"],
  [{ cat: ["Robocop", 2] }, {}, "Robocop2"],
  [
    { cat: ["we all scream for ", "ice", "cream"] },
    {},
    "we all scream for icecream",
  ],
  [{ "%": [1, 2] }, {}, 1],
  [{ "%": [2, 2] }, {}, 0],
  [{ "%": [3, 2] }, {}, 1],
  [{ max: [1, 2, 3] }, {}, 3],
  [{ max: [1, 3, 3] }, {}, 3],
  [{ max: [3, 2, 1] }, {}, 3],
  [{ max: [1] }, {}, 1],
  [{ min: [1, 2, 3] }, {}, 1],
  [{ min: [1, 1, 3] }, {}, 1],
  [{ min: [3, 2, 1] }, {}, 1],
  [{ min: [1] }, {}, 1],

  [{ "+": [1, 2] }, {}, 3],
  [{ "+": [2, 2, 2] }, {}, 6],
  [{ "+": [1] }, {}, 1],
  [{ "+": ["1", 1] }, {}, 2],
  [{ "*": [3, 2] }, {}, 6],
  [{ "*": [2, 2, 2] }, {}, 8],
  [{ "*": [1] }, {}, 1],
  [{ "*": ["1", 1] }, {}, 1],
  [{ "-": [2, 3] }, {}, -1],
  [{ "-": [3, 2] }, {}, 1],
  [{ "-": [3] }, {}, -3],
  [{ "-": ["1", 1] }, {}, 0],
  [{ "/": [4, 2] }, {}, 2],
  [{ "/": [2, 4] }, {}, 0.5],
  [{ "/": ["1", 1] }, {}, 1],

  // Substring
  [{ substr: ["jsonlogic", 4] }, null, "logic"],
  [{ substr: ["jsonlogic", -5] }, null, "logic"],
  [{ substr: ["jsonlogic", 0, 1] }, null, "j"],
  [{ substr: ["jsonlogic", -1, 1] }, null, "c"],
  [{ substr: ["jsonlogic", 4, 5] }, null, "logic"],
  [{ substr: ["jsonlogic", -5, 5] }, null, "logic"],
  [{ substr: ["jsonlogic", -5, -2] }, null, "log"],
  [{ substr: ["jsonlogic", 1, -5] }, null, "son"],

  // Merge arrays
  [{ merge: [] }, null, []],
  [{ merge: [[1]] }, null, [1]],
  [{ merge: [[1], []] }, null, [1]],
  [{ merge: [[1], [2]] }, null, [1, 2]],
  [{ merge: [[1], [2], [3]] }, null, [1, 2, 3]],
  [{ merge: [[1, 2], [3]] }, null, [1, 2, 3]],
  [{ merge: [[1], [2, 3]] }, null, [1, 2, 3]],
  // Given non-array arguments, merge converts them to arrays
  [{ merge: 1 }, null, [1]],
  [{ merge: [1, 2] }, null, [1, 2]],
  [{ merge: [1, [2]] }, null, [1, 2]],

  // Too few args
  [{ if: [] }, null, null],
  [{ if: [true] }, null, true],
  [{ if: [false] }, null, false],
  [{ if: ["apple"] }, null, "apple"],

  // Simple if/then/else cases
  [{ if: [true, "apple"] }, null, "apple"],
  [{ if: [false, "apple"] }, null, null],
  [{ if: [true, "apple", "banana"] }, null, "apple"],
  [{ if: [false, "apple", "banana"] }, null, "banana"],

  // Empty arrays are falsy
  [{ if: [[], "apple", "banana"] }, null, "banana"],
  [{ if: [[1], "apple", "banana"] }, null, "apple"],
  [{ if: [[1, 2, 3, 4], "apple", "banana"] }, null, "apple"],

  // Empty strings are falsy; all other strings are truthy
  [{ if: ["", "apple", "banana"] }, null, "banana"],
  [{ if: ["zucchini", "apple", "banana"] }, null, "apple"],
  [{ if: ["0", "apple", "banana"] }, null, "apple"],

  // You can cast a string to numeric with a unary `+`
  [{ "===": [0, "0"] }, null, false],
  [{ "===": [0, { "+": "0" }] }, null, true],
  [{ if: [{ "+": "0" }, "apple", "banana"] }, null, "banana"],
  [{ if: [{ "+": "1" }, "apple", "banana"] }, null, "apple"],

  // Zero is falsy; all other numbers are truthy
  [{ if: [0, "apple", "banana"] }, null, "banana"],
  [{ if: [1, "apple", "banana"] }, null, "apple"],
  [{ if: [3.1416, "apple", "banana"] }, null, "apple"],
  [{ if: [-1, "apple", "banana"] }, null, "apple"],

  // Truthy and falsy definitions matter in Boolean operations
  [{ "!": [[]] }, {}, true],
  [{ "!!": [[]] }, {}, false],
  [{ and: [[], true] }, {}, []],
  [{ or: [[], true] }, {}, true],

  [{ "!": [0] }, {}, true],
  [{ "!!": [0] }, {}, false],
  [{ and: [0, true] }, {}, 0],
  [{ or: [0, true] }, {}, true],

  [{ "!": [""] }, {}, true],
  [{ "!!": [""] }, {}, false],
  [{ and: ["", true] }, {}, ""],
  [{ or: ["", true] }, {}, true],

  [{ "!": ["0"] }, {}, false],
  [{ "!!": ["0"] }, {}, true],
  [{ and: ["0", true] }, {}, true],
  [{ or: ["0", true] }, {}, "0"],

  // If the conditional is logic, it gets evaluated
  [{ if: [{ ">": [2, 1] }, "apple", "banana"] }, null, "apple"],
  [{ if: [{ ">": [1, 2] }, "apple", "banana"] }, null, "banana"],

  // If the consequents are logic, they get evaluated
  [
    { if: [true, { cat: ["ap", "ple"] }, { cat: ["ba", "na", "na"] }] },
    null,
    "apple",
  ],
  [
    { if: [false, { cat: ["ap", "ple"] }, { cat: ["ba", "na", "na"] }] },
    null,
    "banana",
  ],

  // If/then/elseif/then cases
  [{ if: [true, "apple", true, "banana"] }, null, "apple"],
  [{ if: [true, "apple", false, "banana"] }, null, "apple"],
  [{ if: [false, "apple", true, "banana"] }, null, "banana"],
  [{ if: [false, "apple", false, "banana"] }, null, null],

  [{ if: [true, "apple", true, "banana", "carrot"] }, null, "apple"],
  [{ if: [true, "apple", false, "banana", "carrot"] }, null, "apple"],
  [{ if: [false, "apple", true, "banana", "carrot"] }, null, "banana"],
  [{ if: [false, "apple", false, "banana", "carrot"] }, null, "carrot"],

  [{ if: [false, "apple", false, "banana", false, "carrot"] }, null, null],
  [
    { if: [false, "apple", false, "banana", false, "carrot", "date"] },
    null,
    "date",
  ],
  [
    { if: [false, "apple", false, "banana", true, "carrot", "date"] },
    null,
    "carrot",
  ],
  [
    { if: [false, "apple", true, "banana", false, "carrot", "date"] },
    null,
    "banana",
  ],
  [
    { if: [false, "apple", true, "banana", true, "carrot", "date"] },
    null,
    "banana",
  ],
  [
    { if: [true, "apple", false, "banana", false, "carrot", "date"] },
    null,
    "apple",
  ],
  [
    { if: [true, "apple", false, "banana", true, "carrot", "date"] },
    null,
    "apple",
  ],
  [
    { if: [true, "apple", true, "banana", false, "carrot", "date"] },
    null,
    "apple",
  ],
  [
    { if: [true, "apple", true, "banana", true, "carrot", "date"] },
    null,
    "apple",
  ],

  // Arrays with logic
  [[1, { var: "x" }, 3], { x: 2 }, [1, 2, 3]],
  [{ if: [{ var: "x" }, [{ var: "y" }], 99] }, { x: true, y: 42 }, [42]],

  // Compound tests
  [{ and: [{ ">": [3, 1] }, true] }, {}, true],
  [{ and: [{ ">": [3, 1] }, false] }, {}, false],
  [{ and: [{ ">": [3, 1] }, { "!": true }] }, {}, false],
  [{ and: [{ ">": [3, 1] }, { "<": [1, 3] }] }, {}, true],
  [{ "?:": [{ ">": [3, 1] }, "visible", "hidden"] }, {}, "visible"],

  // Data-driven
  [{ var: ["a"] }, { a: 1 }, 1],
  [{ var: ["b"] }, { a: 1 }, null],
  [{ var: ["a"] }, null, null],
  [{ var: "a" }, { a: 1 }, 1],
  [{ var: "b" }, { a: 1 }, null],
  [{ var: "a" }, null, null],
  [{ var: ["a", 1] }, null, 1],
  [{ var: ["b", 2] }, { a: 1 }, 2],
  [{ var: "a.b" }, { a: { b: "c" } }, "c"],
  [{ var: "a.q" }, { a: { b: "c" } }, null],
  [{ var: ["a.q", 9] }, { a: { b: "c" } }, 9],
  [{ var: 1 }, ["apple", "banana"], "banana"],
  [{ var: "1" }, ["apple", "banana"], "banana"],
  [{ var: "1.1" }, ["apple", ["banana", "beer"]], "beer"],
  [
    {
      and: [
        { "<": [{ var: "temp" }, 110] },
        { "==": [{ var: "pie.filling" }, "apple"] },
      ],
    },
    { temp: 100, pie: { filling: "apple" } },
    true,
  ],
  [
    {
      var: [
        { "?:": [{ "<": [{ var: "temp" }, 110] }, "pie.filling", "pie.eta"] },
      ],
    },
    { temp: 100, pie: { filling: "apple", eta: "60s" } },
    "apple",
  ],
  [
    { in: [{ var: "filling" }, ["apple", "cherry"]] },
    { filling: "apple" },
    true,
  ],
  [{ var: "a.b.c" }, null, null],
  [{ var: "a.b.c" }, { a: null }, null],
  [{ var: "a.b.c" }, { a: { b: null } }, null],
  [{ var: "" }, 1, 1],
  [{ var: null }, 1, 1],
  [{ var: [] }, 1, 1],

  // Missing
  [{ missing: [] }, null, []],
  [{ missing: ["a"] }, null, ["a"]],
  [{ missing: "a" }, null, ["a"]],
  [{ missing: "a" }, { a: "apple" }, []],
  [{ missing: ["a"] }, { a: "apple" }, []],
  [{ missing: ["a", "b"] }, { a: "apple" }, ["b"]],
  [{ missing: ["a", "b"] }, { b: "banana" }, ["a"]],
  [{ missing: ["a", "b"] }, { a: "apple", b: "banana" }, []],
  [{ missing: ["a", "b"] }, {}, ["a", "b"]],
  [{ missing: ["a", "b"] }, null, ["a", "b"]],

  [{ missing: ["a.b"] }, null, ["a.b"]],
  [{ missing: ["a.b"] }, { a: "apple" }, ["a.b"]],
  [{ missing: ["a.b"] }, { a: { c: "apple cake" } }, ["a.b"]],
  [{ missing: ["a.b"] }, { a: { b: "apple brownie" } }, []],
  [{ missing: ["a.b", "a.c"] }, { a: { b: "apple brownie" } }, ["a.c"]],

  // Missing some
  [{ missing_some: [1, ["a", "b"]] }, { a: "apple" }, []],
  [{ missing_some: [1, ["a", "b"]] }, { b: "banana" }, []],
  [{ missing_some: [1, ["a", "b"]] }, { a: "apple", b: "banana" }, []],
  [{ missing_some: [1, ["a", "b"]] }, { c: "carrot" }, ["a", "b"]],

  [{ missing_some: [2, ["a", "b", "c"]] }, { a: "apple", b: "banana" }, []],
  [{ missing_some: [2, ["a", "b", "c"]] }, { a: "apple", c: "carrot" }, []],
  [
    { missing_some: [2, ["a", "b", "c"]] },
    { a: "apple", b: "banana", c: "carrot" },
    [],
  ],
  [
    { missing_some: [2, ["a", "b", "c"]] },
    { a: "apple", d: "durian" },
    ["b", "c"],
  ],
  [
    { missing_some: [2, ["a", "b", "c"]] },
    { d: "durian", e: "eggplant" },
    ["a", "b", "c"],
  ],

  // Missing and If are friends, because empty arrays are falsy in JsonLogic
  [
    { if: [{ missing: "a" }, "missed it", "found it"] },
    { a: "apple" },
    "found it",
  ],
  [
    { if: [{ missing: "a" }, "missed it", "found it"] },
    { b: "banana" },
    "missed it",
  ],

  // Missing, Merge, and If are friends. VIN is always required, APR is only required if financing is true.
  [
    {
      missing: {
        merge: ["vin", { if: [{ var: "financing" }, ["apr"], []] }],
      },
    },
    { financing: true },
    ["vin", "apr"],
  ],

  [
    {
      missing: {
        merge: ["vin", { if: [{ var: "financing" }, ["apr"], []] }],
      },
    },
    { financing: false },
    ["vin"],
  ],

  // Filter, map, all, none, and some
  [{ filter: [{ var: "integers" }, true] }, { integers: [1, 2, 3] }, [1, 2, 3]],
  [{ filter: [{ var: "integers" }, false] }, { integers: [1, 2, 3] }, []],
  [
    { filter: [{ var: "integers" }, { ">=": [{ var: "" }, 2] }] },
    { integers: [1, 2, 3] },
    [2, 3],
  ],
  [
    { filter: [{ var: "integers" }, { "%": [{ var: "" }, 2] }] },
    { integers: [1, 2, 3] },
    [1, 3],
  ],
  // Invalid filter
  [{ filter: [{ var: "integers" }, true] }, { integers: 123 }, []],

  [
    { map: [{ var: "integers" }, { "*": [{ var: "" }, 2] }] },
    { integers: [1, 2, 3] },
    [2, 4, 6],
  ],
  [{ map: [{ var: "integers" }, { "*": [{ var: "" }, 2] }] }, null, []],
  [
    { map: [{ var: "desserts" }, { var: "qty" }] },
    {
      desserts: [
        { name: "apple", qty: 1 },
        { name: "brownie", qty: 2 },
        { name: "cupcake", qty: 3 },
      ],
    },
    [1, 2, 3],
  ],

  [
    {
      reduce: [
        { var: "integers" },
        { "+": [{ var: "current" }, { var: "accumulator" }] },
        0,
      ],
    },
    { integers: [1, 2, 3, 4] },
    10,
  ],
  [
    {
      reduce: [
        { var: "integers" },
        { "+": [{ var: "current" }, { var: "accumulator" }] },
        0,
      ],
    },
    null,
    0,
  ],
  [
    {
      reduce: [
        { var: "integers" },
        { "*": [{ var: "current" }, { var: "accumulator" }] },
        1,
      ],
    },
    { integers: [1, 2, 3, 4] },
    24,
  ],
  [
    {
      reduce: [
        { var: "integers" },
        { "*": [{ var: "current" }, { var: "accumulator" }] },
        0,
      ],
    },
    { integers: [1, 2, 3, 4] },
    0,
  ],
  [
    {
      reduce: [
        { var: "desserts" },
        { "+": [{ var: "accumulator" }, { var: "current.qty" }] },
        0,
      ],
    },
    {
      desserts: [
        { name: "apple", qty: 1 },
        { name: "brownie", qty: 2 },
        { name: "cupcake", qty: 3 },
      ],
    },
    6,
  ],

  [
    { all: [{ var: "integers" }, { ">=": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    true,
  ],
  [
    { all: [{ var: "integers" }, { "==": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    false,
  ],
  [
    { all: [{ var: "integers" }, { "<": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    false,
  ],
  [
    { all: [{ var: "integers" }, { "<": [{ var: "" }, 1] }] },
    { integers: [] },
    false,
  ],
  [
    { all: [{ var: "items" }, { ">=": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    true,
  ],
  [
    { all: [{ var: "items" }, { ">": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    false,
  ],
  [
    { all: [{ var: "items" }, { "<": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    false,
  ],
  [
    { all: [{ var: "items" }, { ">=": [{ var: "qty" }, 1] }] },
    { items: [] },
    false,
  ],

  [
    { none: [{ var: "integers" }, { ">=": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    false,
  ],
  [
    { none: [{ var: "integers" }, { "==": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    false,
  ],
  [
    { none: [{ var: "integers" }, { "<": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    true,
  ],
  [
    { none: [{ var: "integers" }, { "<": [{ var: "" }, 1] }] },
    { integers: [] },
    true,
  ],
  [
    { none: [{ var: "items" }, { ">=": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    false,
  ],
  [
    { none: [{ var: "items" }, { ">": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    false,
  ],
  [
    { none: [{ var: "items" }, { "<": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    true,
  ],
  [
    { none: [{ var: "items" }, { ">=": [{ var: "qty" }, 1] }] },
    { items: [] },
    true,
  ],

  [
    { some: [{ var: "integers" }, { ">=": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    true,
  ],
  [
    { some: [{ var: "integers" }, { "==": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    true,
  ],
  [
    { some: [{ var: "integers" }, { "<": [{ var: "" }, 1] }] },
    { integers: [1, 2, 3] },
    false,
  ],
  [
    { some: [{ var: "integers" }, { "<": [{ var: "" }, 1] }] },
    { integers: [] },
    false,
  ],
  [
    { some: [{ var: "items" }, { ">=": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    true,
  ],
  [
    { some: [{ var: "items" }, { ">": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    true,
  ],
  [
    { some: [{ var: "items" }, { "<": [{ var: "qty" }, 1] }] },
    {
      items: [
        { qty: 1, sku: "apple" },
        { qty: 2, sku: "banana" },
      ],
    },
    false,
  ],
  [
    { some: [{ var: "items" }, { ">=": [{ var: "qty" }, 1] }] },
    { items: [] },
    false,
  ],
] satisfies [any, any, any][];

// Original source: https://jsonlogic.com/rule_like.json
const rule_likeTests = [
  // Pattern checks for type
  [1, "number", true],
  ["falafel", "number", false],
  [[], "number", false],
  [{ var: "a" }, "number", false],

  [1, "string", false],
  ["falafel", "string", true],
  [[], "string", false],
  [{ var: "a" }, "string", false],

  [1, "array", false],
  ["falafel", "array", false],
  [[], "array", true],
  [[1], "array", true],
  [[1, 2], "array", true],
  [{ var: "a" }, "array", false],

  // Wildcards
  [1, "@", true],
  ["falafel", "@", true],
  [[], "@", true],
  [{ var: "a" }, "@", true],
  [{ cat: "falafel" }, { "@": "falafel" }, true],
  [{ cat: "kebab" }, { "@": "falafel" }, false],
  [{ cat: "kebab" }, { "@": "@" }, true],

  // Pattern literally matches a primitive in the rule
  [1, 1, true],
  [1, 2, false],
  [1, "falafel", false],
  ["falafel", "falafel", true],
  ["falafel", "kebab", false],

  // Array content matches
  [[1, 2, 3], [1, 2, 3], true],
  [[1, 2, 69], [1, 2, 3], false],
  // Array order matters
  [[1, 2, 3], [3, 2, 1], false],

  // Arrays of types
  [[1], ["number"], true],
  [[1], ["string"], false],
  [["falafel"], ["string"], true],
  [[1, "falafel", []], ["number", "string", "array"], true],

  // Mismatched rule/pattern
  [{ "*": [0.01, { var: "goods" }] }, { if: ["number", "@"] }, false],
  [["some", "array"], ["some array"], false],
  ["not an array", ["an array"], false],

  // Taxes, rules of different specificity
  [{ "*": [0.01, { var: "goods" }] }, { "*": ["number", "@"] }, true],
  [{ "*": [0.01, { var: "goods" }] }, { "*": ["number", { "@": "@" }] }, true],
  [{ "*": [0.01, { var: "goods" }] }, { "*": ["number", { var: "@" }] }, true],
  [{ "*": [0.01, 5000] }, { "*": ["number", { var: "@" }] }, false],
  [
    { "*": [0.01, { "+": [{ var: "goods" }, { var: "services" }] }] },
    { "*": ["number", { "+": "@" }] },
    true,
  ],
  [
    { "*": [0.01, { "+": [{ var: "goods" }, { var: "services" }] }] },
    { "*": ["number", { "+": "array" }] },
    true,
  ],
] satisfies [any, any, any][];

describe("apply()", () => {
  for (const t of appliesTests) {
    const [rule, data, expected] = t;
    test(`jsonLogic.apply(${t
      .map((m) => JSON.stringify(m))
      .join(", ")}) === ${JSON.stringify(expected)}`, () => {
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

test("uses_data()", () => {
  expect(jsonLogic.uses_data({ a: [1, { var: "b" }] })).toEqual(["b"]);
});

test("Bad operator", () => {
  expect(() => jsonLogic.apply({ fubar: [] })).toThrow(
    /Unrecognized operation/
  );
  expect(() => jsonLogic.apply({ "fubar.rabuf": [] })).toThrow(
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

test("add/rm_operation()", () => {
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

  // Calling a method with multiple var as arguments
  jsonLogic.add_operation("times", (a: number, b: number) => a * b);
  expect(
    jsonLogic.apply({ times: [{ var: "a" }, { var: "b" }] }, { a: 6, b: 7 })
  ).toBe(42);

  // Remove operation
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

  jsonLogic.add_operation("push", (arg: any) => {
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
