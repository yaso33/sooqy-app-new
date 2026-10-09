import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// إعداد بناء منفصل لتطبيق الجوال (SPA خالص بدون TanStack Start):
// TanStack Start client لا يرسم بدون حمولة SSR — غير متوفرة في WebView.
export default defineConfig({
  plugins: [react(), tailwindcss(), tsConfigPaths({ projects: ["./tsconfig.json"] })],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  base: "./",
  build: {
    outDir: "dist-mobile",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./src/entry-mobile.html", import.meta.url)),
        diagnostics: fileURLToPath(new URL("./src/diagnostics.html", import.meta.url)),
      },
    },
  },
});