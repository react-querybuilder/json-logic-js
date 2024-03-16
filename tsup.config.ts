import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options) => {
  const commonOptions: Options = {
    entry: { "json-logic": "src/index.ts" },
    sourcemap: true,
    dts: true,
    ...options,
  };

  const opts: Options[] = [
    {
      ...commonOptions,
      clean: true,
      format: "esm",
    },
    {
      ...commonOptions,
      format: "cjs",
    },
    {
      ...commonOptions,
      dts: false,
      format: "iife",
      minify: true,
      globalName: "JsonLogic",
      outExtension: () => ({ js: ".umd.min.js" }),
    },
  ];

  return opts;
});
