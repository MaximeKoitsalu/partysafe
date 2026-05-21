// ESLint v9 flat config.
//
// Migrated from .eslintrc.json (legacy format ESLint v9 no longer reads — the
// silent miss meant the XSS ban below was not actually enforced in M0-M3).
//
// The load-bearing rule is `no-restricted-syntax` banning innerHTML / outerHTML
// / insertAdjacentHTML assignment (PLAN.md Eng E13). All DOM construction goes
// through src/lib/dom.ts (el / svg / replace), which is textContent-only.

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js", "scripts/**", "src/test/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        requestAnimationFrame: "readonly",
        HTMLElement: "readonly",
        Node: "readonly",
        CustomEvent: "readonly",
        HashChangeEvent: "readonly",
        PointerEvent: "readonly",
      },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message:
            "Direct innerHTML assignment is banned (PLAN.md Eng E13). Use textContent via src/lib/dom.ts el(), or a build-time pre-rendered safe-HTML string for mechanism prose.",
        },
        {
          selector: "AssignmentExpression[left.property.name='outerHTML']",
          message:
            "Direct outerHTML assignment is banned (same rationale as innerHTML). Compose with el() / createElement + appendChild.",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message:
            "insertAdjacentHTML bypasses our XSS defense (PLAN.md Eng E13). Compose with el() / createElement + appendChild.",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "no-console": ["warn", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
);
