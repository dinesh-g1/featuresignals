import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/__tests__/**"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
