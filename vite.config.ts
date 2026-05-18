import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// partysafe Vite config.
//
// Locked decisions from PLAN.md (Eng review):
// - E18: Deterministic build — stable asset names, no Date.now() cache busters.
// - F9:  No source maps in prod (avoid leaking developer paths).
// - F7:  JSON datasets are fetched at runtime (not import-inlined), so the
//        JS bundle stays small. Datasets are emitted into dist/data/ via
//        publicDir conventions (see src/data/README.md for the pipeline).
// - F12: Reproducible build verified by CI workflow `reproducibility.yml`.

export default defineConfig({
  // GitHub Pages will serve us from /partysafe/ in production.
  // The custom domain or a different deploy target can override this via VITE_BASE.
  base: process.env["VITE_BASE"] ?? "/partysafe/",

  plugins: [tailwindcss()],

  build: {
    target: "es2022",
    sourcemap: false,
    cssCodeSplit: true,
    minify: "esbuild",
    // Deterministic asset names — content-hashed, no timestamps.
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
    // Allow CI to enforce bundle budgets via `bundlesize` package (see PLAN.md).
    reportCompressedSize: true,
  },

  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },

  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
