import { defineConfig } from "vitest/config";

// Unit tests for the game: data contract, replay, room geometry and physics.
// Unlike spec/ (which checks the running, deployed app over HTTP) these need
// no server, so they run on their own and as part of `pnpm check`.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
