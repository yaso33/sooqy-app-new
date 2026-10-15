import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect:
      typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//")
        ? s["redirect"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — SOOQY" },
      { name: "description", content: "سجّل الدخول إلى حسابك في SOOQY لحجز المنتجات وتتبع طلباتك." },
      { property: "og:title", content: "تسجيل الدخول — SOOQY" },
      { property: "og:description", content: "حسابك في منصة التسوق المحلي الجزائرية." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: (redirect ?? "/") as "/", replace: true });
  }, [user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني ✉️");
      }
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(
        msg.includes("Invalid login") ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (redirect) sessionStorage.setItem("sooqy-redirect", redirect);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (r.error) toast.error("تعذر تسجيل الدخول عبر Google");
  };

  return (
    <div className="space-y-6 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link to="/" aria-label="رجوع" className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft">
        <ArrowRight className="size-5" />
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">SOOQY 🇩🇿</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in" ? "مرحباً بعودتك" : "أنشئ حسابك خلال ثوانٍ"}
        </p>
      </div>
      <button onClick={google} className="w-full rounded-2xl border bg-card py-3 font-bold shadow-soft">
        المتابعة باستخدام Google
      </button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="h-12 w-full rounded-xl border bg-card px-3" />
        )}
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="h-12 w-full rounded-xl border bg-card px-3" />
        <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" className="h-12 w-full rounded-xl border bg-card px-3" />
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "جارٍ المعالجة..." : mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm font-semibold text-primary">
        {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً جديداً" : "لديك حساب؟ سجّل الدخول"}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        بالمتابعة فإنك توافق على <Link to="/terms" className="underline">شروط الاستخدام</Link>
      </p>
    </div>
  );
}
