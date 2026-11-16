import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**", ".idea/**", ".git/**", ".cache/**"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        // Measured 2026-08-14 baseline. Raise these values as coverage grows;
        // the production-readiness target remains 80% for every metric.
        lines: 48,
        functions: 48,
        branches: 42,
        statements: 47,
      },
    },
  },
});
