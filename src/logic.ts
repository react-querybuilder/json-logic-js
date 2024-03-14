import type {
  ProbablyBasicReservedOperations,
  ProbablyReservedOperations,
} from "./types";

/**
 * Returns a new array that contains no duplicates.
 * The original array is not modified.
 */
const arrayUnique = (array: any[]) => {
  const a = [];
  for (const el of array) {
    if (a.indexOf(el) === -1) {
      a.push(el);
    }
  }
  return a;
};

const operations: Record<
  ProbablyBasicReservedOperations,
  (...args: any[]) => any
> = {
  "==": (a, b) => a == b,
  "===": (a, b) => a === b,
  "!=": (a, b) => a != b,
  "!==": (a, b) => a !== b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "<": (a, b, c) => (typeof c === "undefined" ? a < b : a < b && b < c),
  "<=": (a, b, c) => (typeof c === "undefined" ? a <= b : a <= b && b <= c),
  "!!": (a) => truthy(a),
  "!": (a) => !truthy(a),
  "%": (a, b) => a % b,
  log: (a) => {
    console.log(a);
    return a;
  },
  in: (a, b) => (b && b.indexOf ? b.indexOf(a) >= 0 : false),
  cat: (...args) => args.join(""),
  substr: (source, start, end) => {
    // TODO: rewrite this with `.substring()` since `.substr()` is deprecated?
    if (end < 0) {
      // JavaScript doesn't support negative `end`; this emulates PHP behavior:
      const temp = `${source}`.substr(start);
      return temp.substr(0, temp.length + end);
    }
    return `${source}`.substr(start, end);
  },
  "+": (...args) =>
    args.reduce((prev, curr) => parseFloat(prev) + parseFloat(curr), 0),
  "*": (...args) =>
    args.reduce((prev, curr) => parseFloat(prev) * parseFloat(curr), 1),
  "-": (a, b) => (typeof b === "undefined" ? -a : a - b),
  "/": (a, b) => a / b,
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  merge: (...args) => args.reduce((a, b) => a.concat(b), []),
  var: (data, a, b) => {
    const null_if_undefined = b ?? null;
    if ((a ?? "") === "") {
      return data;
    }
    const sub_props = `${a}`.split(".");
    for (const sub_prop of sub_props) {
      if (data === null || typeof data === "undefined") {
        return null_if_undefined;
      }
      // Descending into data
      data = data[sub_prop];
      if (typeof data === "undefined") {
        return null_if_undefined;
      }
    }
    return data;
  },
  missing: (data, ...args) => {
    // `missing` can receive many keys as many arguments, like {"missing":[1,2]}.
    // `missing` can also receive *one* argument that is an array of keys,
    // which typically happens if it's actually acting on the output of another
    // command like `if` or `merge`.
    const missing = [];
    const keys = Array.isArray(args[0]) ? args[0] : args;

    for (const key of keys) {
      const value = apply({ var: key }, data);
      if ((value ?? "") === "") {
        missing.push(key);
      }
    }

    return missing;
  },
  missing_some: (data, need_count, options) => {
    // `missing_some` takes two arguments: 1) how many (minimum) items
    // must be present, and 2) an array of keys (just like `missing`)
    // to check for presence.
    const are_missing = apply({ missing: options }, data);

    if (options.length - are_missing.length >= need_count) {
      return [];
    }

    return are_missing;
  },
};

const is_logic = (
  logic: any
): logic is Record<ProbablyReservedOperations, any> =>
  // It's an object...
  typeof logic === "object" &&
  // and not `null`...
  logic !== null &&
  // and not an array...
  !Array.isArray(logic) &&
  // with exactly one key.
  // Note: There is no way to enforce this last condition in TypeScript.
  Object.keys(logic).length === 1;

/**
 * This helper will defer to the JsonLogic spec as a tie-breaker when different
 * language interpreters define different behavior for the truthiness of
 * primitives. For example, PHP considers empty arrays to be falsy, but Javascript
 * considers them to be truthy. JsonLogic, as an ecosystem, needs to have one
 * consistent answer.
 *
 * Spec and rationale here: http://jsonlogic.com/truthy
 */
const truthy = (value: any) =>
  Array.isArray(value) && value.length === 0 ? false : !!value;

const get_operator = (logic: Record<string, any>) => Object.keys(logic)[0];

const get_values = (logic: Record<string, any>) => logic[get_operator(logic)];

const apply = (logic: Record<string, any>, data: any): any => {
  // Does this array contain logic? Only one way to find out.
  if (Array.isArray(logic)) {
    return logic.map((l) => apply(l, data));
  }
  // You've recursed to a primitive, stop!
  if (!is_logic(logic)) {
    return logic;
  }

  const op = get_operator(logic);
  const valsTemp = logic[op];
  const values = Array.isArray(valsTemp) ? valsTemp : [valsTemp];

  // 'if', 'and', and 'or' violate the normal rule of depth-first calculating consequents, let each manage recursion as needed.
  if (op === "if" || op == "?:") {
    // 'if' should be called with an odd number of parameters, no less than 3
    // This works on the pattern:
    // if ( 0 ) { 1 } else { 2 };
    // if ( 0 ) { 1 } else if ( 2 ) { 3 } else { 4 };
    // if ( 0 ) { 1 } else if ( 2 ) { 3 } else if ( 4 ) { 5 } else { 6 };
    // ...etc.
    // The implementation is:
    // For pairs of values ((0,1) then (2,3) then (4,5) etc)...
    // 1. If the first evaluates truthy, evaluate and return the second.
    // 2. If the first evaluates falsy, jump to the next pair (e.g, (0,1) to (2,3)).
    // 3. If only one parameter remains, evaluate and return it (it's an "else" and all the "if"/"else-if"s were false)
    // 4. If no parameters remain, return `null` (not great practice, but there was no "else" to evaluate).
    let i;
    for (i = 0; i < values.length - 1; i += 2) {
      if (truthy(apply(values[i], data))) {
        return apply(values[i + 1], data);
      }
    }
    if (values.length === i + 1) {
      return apply(values[i], data);
    }
    return null;
  } else if (op === "and") {
    // Return first falsy, or last
    let current;
    for (const val of values) {
      current = apply(val, data);
      if (!truthy(current)) {
        return current;
      }
    }
    return current; // Last
  } else if (op === "or") {
    // Return first truthy, or last
    let current;
    for (const val of values) {
      current = apply(val, data);
      if (truthy(current)) {
        return current;
      }
    }
    return current; // Last
  } else if (op === "filter") {
    const scopedData = apply(values[0], data);
    const scopedLogic = values[1];

    if (!Array.isArray(scopedData)) {
      return [];
    }
    // Return only the elements from the array in the first argument
    // that return truthy when passed to the logic in the second argument.
    // For parity with JavaScript, re-index the returned array.
    return scopedData.filter((datum) => truthy(apply(scopedLogic, datum)));
  } else if (op === "map") {
    const scopedData = apply(values[0], data);
    const scopedLogic = values[1];

    if (!Array.isArray(scopedData)) {
      return [];
    }

    return scopedData.map((datum) => apply(scopedLogic, datum));
  } else if (op === "reduce") {
    const scopedData = apply(values[0], data);
    const scopedLogic = values[1];
    const initial = typeof values[2] !== "undefined" ? values[2] : null;

    if (!Array.isArray(scopedData)) {
      return initial;
    }

    return scopedData.reduce(
      (accumulator, current) => apply(scopedLogic, { current, accumulator }),
      initial
    );
  } else if (op === "all") {
    const scopedData = apply(values[0], data);
    const scopedLogic = values[1];
    // All of an empty set is false. Note: `some` and `none` have correct fallback after the for loop
    if (!Array.isArray(scopedData) || scopedData.length === 0) {
      return false;
    }
    for (const sd of scopedData) {
      if (!truthy(apply(scopedLogic, sd))) {
        return false; // First falsy, short circuit
      }
    }
    return true; // All were truthy
  } else if (op === "none") {
    const scopedData = apply(values[0], data);
    const scopedLogic = values[1];

    if (!Array.isArray(scopedData) || !scopedData.length) {
      return true;
    }
    for (const sd of scopedData) {
      if (truthy(apply(scopedLogic, sd))) {
        return false; // First truthy, short circuit
      }
    }
    return true; // None were truthy
  } else if (op === "some") {
    const scopedData = apply(values[0], data);
    const scopedLogic = values[1];

    if (!Array.isArray(scopedData) || scopedData.length === 0) {
      return false;
    }
    for (const sd of scopedData) {
      if (truthy(apply(scopedLogic, sd))) {
        return true; // First truthy, short circuit
      }
    }
    return false; // None were truthy
  } else if (op === "var") {
    return operations.var(data, ...values.map((val: any) => apply(val, data)));
  } else if (op === "missing") {
    return operations.missing(
      data,
      ...values.map((val: any) => apply(val, data))
    );
  } else if (op === "missing_some") {
    return operations.missing_some(
      data,
      ...values.map((val: any) => apply(val, data))
    );
  }

  // Everyone else gets immediate depth-first recursion
  const valuesApplied = values.map((val: any) => apply(val, data));

  // Structured commands like % or > can name formal arguments while flexible commands (like missing or merge) can operate on the pseudo-array arguments
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
  if (operations.hasOwnProperty(op) && typeof operations[op] === "function") {
    return operations[op](...valuesApplied);
  } else if (op.indexOf(".") > 0) {
    // Contains a dot, and not in the 0th position
    const sub_ops = `${op}`.split(".");
    let operation: any = operations;
    for (let i = 0; i < sub_ops.length; i++) {
      if (!operation.hasOwnProperty(sub_ops[i])) {
        throw new Error(
          "Unrecognized operation " +
            op +
            " (failed at " +
            sub_ops.slice(0, i + 1).join(".") +
            ")"
        );
      }
      // Descending into operations
      operation = operation[sub_ops[i]];
    }

    return operation.apply(data, valuesApplied);
  }

  throw new Error("Unrecognized operation " + op);
};

const uses_data = (logic: any) => {
  const collection: any[] = [];

  if (is_logic(logic)) {
    const op = get_operator(logic);
    const valsTemp = logic[op];
    const values = Array.isArray(valsTemp) ? valsTemp : [valsTemp];

    if (op === "var") {
      // TODO: Cover the case where the arg to `var` is itself a rule.
      collection.push(values[0]);
    } else {
      // Recursion!
      for (const val of values) {
        collection.push(...uses_data(val));
      }
    }
  }

  return arrayUnique(collection);
};

const add_operation = (name: string, code: (...args: any[]) => any) => {
  operations[name] = code;
};

const rm_operation = (name: string) => {
  delete operations[name];
};

const rule_like = (rule: any, pattern: any): boolean => {
  if (pattern === rule) {
    return true;
  }
  // TODO: Deep object equivalency?
  if (pattern === "@") {
    return true;
  }
  // Wildcard!
  if (pattern === "number") {
    return typeof rule === "number";
  }
  if (pattern === "string") {
    return typeof rule === "string";
  }
  if (pattern === "array") {
    // `!is_logic` test might be superfluous in JavaScript
    return Array.isArray(rule) && !is_logic(rule);
  }

  if (is_logic(pattern)) {
    if (is_logic(rule)) {
      const pattern_op = get_operator(pattern);
      const rule_op = get_operator(rule);

      if (pattern_op === "@" || pattern_op === rule_op) {
        return rule_like(get_values(rule), get_values(pattern));
      }
    }
    // `pattern` is logic but `rule` isn't,
    // so they can't be equalivalent
    return false;
  }

  if (Array.isArray(pattern)) {
    if (Array.isArray(rule)) {
      if (pattern.length !== rule.length) {
        return false;
      }
      // Note, array order MATTERS, because we're using this array test
      // logic to consider arguments, where order can matter (e.g., '+'
      // is commutative, but '-' or 'if' or 'var' are NOT).
      for (let i = 0; i < pattern.length; i += 1) {
        // If any fail, we fail
        if (!rule_like(rule[i], pattern[i])) {
          return false;
        }
      }
      return true; // If they *all* passed, we pass
    } else {
      return false; // Pattern is array, rule isn't
    }
  }

  // Not logic, not array, not a === match for rule.
  return false;
};

const jsonLogic: Record<string, (...args: any[]) => any> = {
  is_logic,
  truthy,
  get_operator,
  get_values,
  apply,
  uses_data,
  add_operation,
  rm_operation,
  rule_like,
};

export default jsonLogic;
