import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Forbid raw <input>/<textarea> in components — use Input/Textarea (CompositionInput) instead.
  // This prevents IME composition bugs with Chinese/Japanese/Korean text input.
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/composition-input.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='input']",
          message:
            "Use <Input> from @/components/ui/input instead of raw <input>. Raw <input> breaks Chinese/Japanese IME composition. For type=\"file\"/\"hidden\", add // eslint-disable-next-line no-restricted-syntax",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message:
            "Use <Textarea> from @/components/ui/textarea instead of raw <textarea>. Raw <textarea> breaks Chinese/Japanese IME composition.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated service worker
    "public/sw.js",
    // Claude Code skills (non-project files)
    ".claude/**",
    // Test coverage reports
    "coverage/**",
    // Playwright cache and reports
    "playwright/.cache/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
