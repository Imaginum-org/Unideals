import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @animateicons/react assigns `Icon.displayName = "..."` for every icon at
// module top level. Rollup must treat those property writes as side effects,
// which kept all ~250 icons (≈470 kB) in the bundle although we use ~15.
// displayName only matters for React DevTools, so strip it in production
// builds for this package only.
const stripAnimateIconsDisplayName = {
  name: "strip-animateicons-displayname",
  apply: "build",
  transform(code, id) {
    if (!/[\\/]@animateicons[\\/]react[\\/]dist[\\/].+\.js$/.test(id)) return null;
    return {
      // Anchor on the preceding statement boundary (\b would not cover
      // identifiers that start with "$", e.g. `$o.displayName=...`).
      code: code.replace(/(^|[;}\s])[\w$]+\.displayName="[^"]*";/g, "$1"),
      map: null,
    };
  },
};

export default defineConfig(({ command }) => ({
  plugins: [react(), stripAnimateIconsDisplayName],
  // Production builds ship a clean browser console: no debug noise, and no
  // error objects that carry request payloads (axios errors include the
  // request body, e.g. a signup password). Dev keeps full logging.
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : undefined,
  server: {
    host: true,
    // Backend CORS + FRONTEND_URL expect exactly :5173. Fail loudly if another
    // dev server (e.g. Unideals_Marketing) already holds it, instead of
    // silently ending up beside it and serving the wrong app on localhost.
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // @animateicons/react ships every icon as an un-annotated
      // `forwardRef(...)` call in one 411 kB file, so Rollup kept ALL icons
      // although we use ~15. forwardRef has no side effects — marking it
      // pure lets unused icons tree-shake away.
      treeshake: {
        manualPureFunctions: ["forwardRef"],
      },
      output: {
        // Keep React together; split heavy, rarely-shared vendors so the
        // initial Home chunk stays lean. Route components split via
        // React.lazy in routes.jsx.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["react-icons/fi", "react-icons/fa", "react-icons/io", "react-icons/io5", "react-icons/lu", "react-icons/hi2", "react-icons/md", "react-icons/fa6", "react-icons/gr", "react-icons/ci", "react-icons/bs", "react-icons/go", "react-icons/ri", "lucide-react"],
        },
      },
    },
  },
}));
