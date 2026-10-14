import { defineConfig } from "vite";

// `Workspace/` is a network share holding the read-only research workspaces
// (old game, old research, the evidence workspace). The game never reads it at
// runtime — the bundle it needs is copied into `game_data/` — so the dev
// server must not crawl or watch it: it is large and slow over SMB.
const WORKSPACE = "**/Workspace/**";

export default defineConfig({
  // Relative asset URLs, so the build works from any path.
  base: "./",
  define: { __WORKBENCH_LOCAL__: "false" },
  plugins: [{
    name: "production-browser-boundary",
    apply: "build",
    generateBundle(_options, bundle) {
      const forbidden = /(?:node:|__vite-browser-external|\/scripts\/|\/workbench\/(?:local-storage|runner|coop-session|coop-authority)\.ts|\/server\/(?:app|multiplayer|identity|atomic-json|persistence)\.ts)/;
      const modules = new Set<string>();
      for (const chunk of Object.values(bundle)) if (chunk.type === "chunk") {
        for (const id of Object.keys(chunk.modules)) {
          if (forbidden.test(id)) this.error(`Development/server module reached production browser bundle: ${id}`);
          modules.add(id);
        }
      }
      console.log(`Audited ${modules.size} production browser modules: no Node services, local storage adapter or draft multiplayer runner.`);
    },
  }],
  server: {
    // Preserve Host for the backend's Origin check, including campaign PUTs.
    proxy: {
      "/api": { target: "http://127.0.0.1:8080", changeOrigin: false },
      "/readme": { target: "http://127.0.0.1:8080", changeOrigin: false },
      "/ws": { target: "ws://127.0.0.1:8080", ws: true, changeOrigin: false },
    },
    watch: { ignored: [WORKSPACE] },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
  build: {
    rollupOptions: {
      input: ["index.html", "workbench.html"],
    },
  },
});
