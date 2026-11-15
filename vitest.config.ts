import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/..." import shortcut the app uses (see tsconfig.json).
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // The database-backed tests share one database, so run files one at
    // a time rather than in parallel.
    fileParallelism: false,
  },
});
