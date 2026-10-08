// نقطة دخول SPA لتطبيق الجوال (Capacitor WebView):
// TanStack Start client يتطلب حمولة SSR (__TSR__) للرسم — غير متوفرة في WebView.
// الحل: RouterProvider مباشرة (SPA خالص) — يرسم من الصفر بدون hydration.
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

// صائد أخطاء الشاشة أولًا (يتجاهل SSR)
import "@/lib/screen-error";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./styles.css";

const router = getRouter();
const queryClient = router.options.context.queryClient;

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);