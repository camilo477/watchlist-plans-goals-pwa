import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repo = "watchlist-plans-goals-pwa";

export default defineConfig({
  base: `/${repo}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // recomendado para GH Pages (que el SW aplique en el scope correcto)
      scope: `/${repo}/`,
      manifest: {
        name: "App Pareja",
        short_name: "Pareja",
        // IMPORTANTE: debe arrancar dentro del repo
        start_url: `/${repo}/`,
        display: "standalone",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        icons: [
          { src: `/${repo}/pwa-192.png`, sizes: "192x192", type: "image/png" },
          { src: `/${repo}/pwa-512.png`, sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
