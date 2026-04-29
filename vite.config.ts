import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repo = "watchlist-plans-goals-pwa";

function normalizeBasePath(value: string) {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(
    env.VITE_BASE_PATH || (command === "build" ? `/${repo}/` : "/"),
  );

  return {
    base: basePath,
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          },
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        scope: basePath,
        manifest: {
          name: "App Pareja",
          short_name: "Pareja",
          start_url: basePath,
          display: "standalone",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          ],
        },
      }),
    ],
  };
});
