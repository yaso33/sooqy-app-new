// نقطة دخول SPA لتطبيق الجوال (Capacitor WebView):
// TanStack Start client يتطلب حمولة SSR (__TSR__) للرسم — غير متوفرة في WebView.
// الحل: RouterProvider مباشرة (SPA خالص) — يرسم من الصفر بدون hydration.
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { getRouter } from "./router";

// صائد أخطاء الشاشة أولًا (يتجاهل SSR)
import "@/lib/screen-error";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./styles.css";

// نظام السجلات المحلية و Error Tracking (Sentry)
import "./utils/sentry";
import { initDiagnostics } from "./utils/diagnostics";
import { AppErrorBoundary, ErrorFallback } from "./components/AppErrorBoundary";

// الوصول إلى شاشة التشخيص: 5 ضغطات سريعة في أي مكان خلال 3 ثوانٍ
// تُفعّل زرًا عائمًا صغيرًا (📋) يفتح diagnostics.html — سجل التشخيص.
function setupDebugAccess() {
  if (typeof window === "undefined") return;
  const isDebug = () => localStorage.getItem("sooqy:debug") === "1";
  const showButton = () => {
    if (document.getElementById("sooqy-debug-btn")) return;
    const btn = document.createElement("button");
    btn.id = "sooqy-debug-btn";
    btn.textContent = "📋";
    btn.title = "سجل التشخيص";
    btn.setAttribute("aria-label", "سجل التشخيص");
    btn.style.cssText =
      "position:fixed;bottom:88px;left:12px;z-index:2147483646;width:42px;height:42px;border-radius:21px;background:#6366F1;color:#fff;font-size:19px;border:none;box-shadow:0 2px 10px rgba(0,0,0,.3);opacity:.9;display:flex;align-items:center;justify-content:center";
    btn.addEventListener("click", () => {
      window.location.href = "diagnostics.html";
    });
    document.body.appendChild(btn);
  };
  if (isDebug()) {
    showButton();
    return;
  }
  let taps: number[] = [];
  document.addEventListener("click", () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 3000);
    taps.push(now);
    if (taps.length >= 5) {
      localStorage.setItem("sooqy:debug", "1");
      showButton();
    }
  });
}

initDiagnostics();
setupDebugAccess();

// تعويض تمرير الحقل النشط عند ظهور لوحة المفاتيح:
// مع adjustMarginsForEdgeToEdge تُضاف مسافة سفلية للـ WebView،
// فنمرّر الحقل المركّز إلى منتصف المنطقة المرئية ليبقى ظاهرًا فوق الكيبورد.
if (Capacitor.isNativePlatform()) {
  Keyboard.addListener("keyboardWillShow", () => {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "center", behavior: "auto" });
    }
  });
}

const router = getRouter();
const queryClient = router.options.context.queryClient;

// Deep link لـ OAuth (تسجيل الدخول عبر Google):
// بعد الموافقة في المتصفح يعيد Android فتح التطبيق برابط
// com.sooqy.app://auth/callback?code=... — نوجّهه لصفحة /auth/callback لتبادل الكود.
if (Capacitor.isNativePlatform()) {
  App.addListener("appUrlOpen", ({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol !== "com.sooqy.app:" || u.host !== "auth" || u.pathname !== "/callback") return;
      const search: { reset: boolean; code?: string | undefined } = {
        reset: u.searchParams.get("reset") === "1",
        code: u.searchParams.get("code") ?? undefined,
      };
      router.navigate({ to: "/auth/callback", search, replace: true });
    } catch {
      // رابط غير متوقع — نتجاهله
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary fallback={<ErrorFallback />}>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </AppErrorBoundary>,
);