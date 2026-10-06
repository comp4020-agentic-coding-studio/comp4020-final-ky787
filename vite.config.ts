import { defineConfig } from "vite";

// `Workspace/` is a network share holding the read-only research workspaces
// (old game, old research, the evidence workspace). The game never reads it at
// runtime — the bundle it needs is copied into `game_data/` — so the dev
// server must not crawl or watch it: it is large and slow over SMB.
const WORKSPACE = "**/Workspace/**";

export default defineConfig({
  // Relative asset URLs, so the build works from any path.
  base: "./",
  server: {
    proxy: { "/api": "http://localhost:8080", "/readme": "http://localhost:8080", "/ws": { target: "ws://localhost:8080", ws: true } },
    watch: { ignored: [WORKSPACE] },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
});
