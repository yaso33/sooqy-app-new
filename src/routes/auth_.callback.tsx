import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  validateSearch: (s: Record<string, unknown>): { reset: boolean; code?: string | undefined } => ({
    reset: s["reset"] === "1" || s["reset"] === true || s["reset"] === "true",
    code: typeof s["code"] === "string" ? s["code"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "جارٍ تسجيل الدخول — SOOQY" },
      { name: "description", content: "يتم التحقق من حسابك وتحويلك." },
      { property: "og:title", content: "تسجيل الدخول — SOOQY" },
      { property: "og:description", content: "التحقق من جلسة الدخول." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallbackPage,
});

function safePath(p: string | null) {
  // يمنع إعادة التوجيه لمواقع خارجية: يرفض البروتوكول النسبي // و /\ (بعض المتصفحات تفسر \ كـ /)
  return p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\") && !p.includes("\\")
    ? p
    : "/";
}

function CallbackPage() {
  const navigate = useNavigate();
  const { reset, code } = Route.useSearch();
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const target = safePath(sessionStorage.getItem("sooqy-redirect"));
      sessionStorage.removeItem("sooqy-redirect");
      navigate({ to: target as "/", replace: true });
    };
    if (reset) {
      // رابط استعادة كلمة المرور — نوجه المستخدم لتعيين كلمة مرور جديدة
      navigate({ to: "/auth", search: { reset: true }, replace: true });
      return;
    }
    const run = async () => {
      // في التطبيق الأصلي لا يعيد الـ deep link تحميل الصفحة، لذا لا يلتقطه
      // supabase-js تلقائيًا (detectSessionInUrl) — نتبادل الكود يدويًا.
      if (code && Capacitor.isNativePlatform()) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.debug("[auth/callback] exchange failed", error.message);
          navigate({ to: "/auth", replace: true });
        } else {
          go();
        }
        return;
      }
      // الويب: supabase-js يكتشف الكود في الرابط ويتبادله تلقائيًا.
      supabase.auth.getSession().then(({ data }) => data.session && go());
    };
    void run();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => session && go());
    const t = setTimeout(() => {
      if (!done) navigate({ to: "/auth", replace: true });
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate, reset, code]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-bold">جارٍ التحقق من حسابك...</p>
      <p className="text-xs text-muted-foreground">سيتم تحويلك تلقائياً خلال لحظات.</p>
    </div>
  );
}
