import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// قيم Supabase تُدمج داخل حزمة المتصفح وقت البناء. لو بُنِي الموقع بلا متغيرات
// VITE_ يصل الرابط فارغًا إلى المتصفح فيرمي createClient الخطأ
// "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" وتظهر صفحة خطأ —
// مع أن SSR يعمل لأن الخادم يقرأ متغيرات البيئة وقت التشغيل.
//
// نشتق هنا قيم المتصفح من متغيرات الخادم عند غيابها. ويجب أن يتم ذلك عبر
// process.env لا عبر `define`: يُنفَّذ هذا الملف قبل loadEnv في Vite، فيقرؤها
// Vite كأنها متغيرات عادية فتعمل في كل صيغ الكتابة (import.meta.env.X و ["X"]).
const deriveClientEnv = (target: string, ...sources: string[]) => {
  if (process.env[target]) return;
  const fallback = sources.map((key) => process.env[key]).find((value) => value);
  if (fallback) process.env[target] = fallback;
};
deriveClientEnv("VITE_SUPABASE_URL", "SUPABASE_URL");
deriveClientEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
deriveClientEnv("VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID");

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
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("maplibre-gl")) return "vendor-maplibre";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("@tanstack/react-router")) return "vendor-router";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("sonner")) return "vendor-sonner";
            if (id.includes("@supabase")) return "vendor-supabase";
          },
        },
      },
    },
    // لا تُضِف optimizeDeps.exclude لـ maplibre-gl: إخراجها من التجميع المسبق
    // يجعل التطوير يخدم المكتبة غير مُجمَّعة (~1000 طلب) فيتأخر ظهور الخريطة.
    // الحل الصحيح لعنوان الـ worker مطبَّق في StoreMap (setWorkerUrl).
    server: {
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-XSS-Protection": "1; mode=block",
      },
    },
  };
});
