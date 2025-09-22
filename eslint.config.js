// @ts-check

import eslint from "@eslint/js"
import { defineConfig } from "eslint/config"
import prettierRecommended from "eslint-plugin-prettier/recommended"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import tseslint from "typescript-eslint"

export default defineConfig(
  eslint.configs.recommended,
  prettierRecommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-misused-spread": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],

      "no-shadow": "error",

      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // I usually want empty string to also fallback to the default, so this rule makes no sense
      "@typescript-eslint/prefer-nullish-coalescing": "off",

      // While Record syntax is nice when you don't care about giving info about the key, it is nice to be
      // able to use a more descriptive type for the key when you need it (E.g. { [guildId: string]: ... })
      "@typescript-eslint/consistent-indexed-object-style": "off",
    },
  },
)
