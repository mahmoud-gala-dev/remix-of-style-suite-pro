import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      // Focus coverage on hand-written app code under src/lib (server fns + helpers).
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/*.server.ts",
        "src/lib/**/*.client.ts",
        "src/lib/**/types.ts",
        "src/lib/**/*.d.ts",
      ],
      thresholds: { lines: 60, statements: 60, functions: 55, branches: 65 },
    },
  },
});