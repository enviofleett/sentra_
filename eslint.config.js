import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["supabase/functions/**", "dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-require-imports": "off",
      // Temporary lint stabilization policy for legacy admin + agent rollout.
      // Keep warnings visible while allowing CI/dev flow.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "no-empty": "warn",
      "no-case-declarations": "warn",
      "no-useless-escape": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-expressions": "warn"
    }
  }
];
