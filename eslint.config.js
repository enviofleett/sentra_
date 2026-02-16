import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["supabase/functions/**", "dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];
