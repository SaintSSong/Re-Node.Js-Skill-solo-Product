import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  {
    rules: { "no-unused-vars": "warn" }, // off, error 등이 있다. 경고, 끄기, 붉은 줄  이렇게 생각하면 됨
  },
];
ㄴ;
