import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
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
});
