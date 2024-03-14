export type ReservedOperations =
  | "var"
  | "missing"
  | "missing_some"
  | "if"
  | "=="
  | "==="
  | "!="
  | "!=="
  | "!"
  | "!!"
  | "or"
  | "and"
  | ">"
  | ">="
  | "<"
  | "<="
  | "max"
  | "min"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "map"
  | "filter"
  | "reduce"
  | "all"
  | "none"
  | "some"
  | "merge"
  | "in"
  | "cat"
  | "substr"
  | "log";

export type ProbablyBasicReservedOperations =
  | Exclude<
      ReservedOperations,
      | "if"
      | "or"
      | "and"
      | "map"
      | "filter"
      | "reduce"
      | "all"
      | "none"
      | "some"
    >
  | (string & {});

export type ProbablyReservedOperations = ReservedOperations | (string & {});
