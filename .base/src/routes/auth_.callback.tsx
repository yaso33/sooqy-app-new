import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
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
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

function CallbackPage() {
  const navigate = useNavigate();
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const target = safePath(sessionStorage.getItem("sooqy-redirect"));
      sessionStorage.removeItem("sooqy-redirect");
      navigate({ to: target as "/", replace: true });
    };
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => session && go());
    const t = setTimeout(() => {
      if (!done) navigate({ to: "/auth", replace: true });
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-bold">جارٍ التحقق من حسابك...</p>
      <p className="text-xs text-muted-foreground">سيتم تحويلك تلقائياً خلال لحظات.</p>
    </div>
  );
}
