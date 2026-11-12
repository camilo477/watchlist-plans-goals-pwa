import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repo = "watchlist-plans-goals-pwa";

function normalizeBasePath(value: string) {
  if (!value || value === "/") return "/";
  if (value === "." || value === "./") return "./";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appName = mode === "demo" ? "Nuestro espacio" : "DianiMilo";
  const basePath = normalizeBasePath(
    env.VITE_BASE_PATH || (mode === "demo" ? "./" : command === "build" ? `/${repo}/` : "/"),
  );

  return {
    base: basePath,
    define: { "import.meta.env.VITE_DEMO_ONLY": JSON.stringify(mode === "demo" ? "true" : "false") },
    build: {
      outDir: mode === "demo" ? "dist-demo" : "dist",
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
      {
        name: "app-title",
        transformIndexHtml: (html) => html.replace(/<title>.*?<\/title>/, `<title>${appName}</title>`),
      },
      VitePWA({
        registerType: "autoUpdate",
        scope: basePath,
        manifest: {
          name: appName,
          short_name: appName,
          description: "Nuestro espacio compartido para películas, planes, metas y recuerdos.",
          lang: "es-CO",
          start_url: basePath,
          display: "standalone",
          theme_color: "#FFF8E8",
          background_color: "#F6EAD7",
          icons: [
            {
              src: "pwa-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
  };
});
