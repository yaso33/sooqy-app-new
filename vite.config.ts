import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(async () => {
  const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
  return {
    plugins: [
      tanstackStart({ server: { entry: "server" } }),
      react(),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    // لا تُضِف optimizeDeps.exclude لـ maplibre-gl: إخراجها من التجميع المسبق
    // يجعل التطوير يخدم المكتبة غير مُجمَّعة (~1000 طلب) فيتأخر ظهور الخريطة.
    // الحل الصحيح لعنوان الـ worker مطبَّق في StoreMap (setWorkerUrl).
  };
});