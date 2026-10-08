import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; reset?: boolean } => ({
    redirect:
      typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//")
        ? s["redirect"]
        : undefined,
    reset: s["reset"] === "1" || s["reset"] === true || s["reset"] === "true",
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
  const { redirect, reset } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !reset) navigate({ to: (redirect ?? "/") as "/", replace: true });
  }, [user, redirect, navigate, reset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reset && password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?reset=1`,
        });
        if (error) throw error;
        toast.success("أُرسل رابط استعادة كلمة المرور إلى بريدك ✉️");
        setForgot(false);
      } else if (reset) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("تم تحديث كلمة المرور بنجاح 🔒");
        navigate({ to: "/", replace: true });
      } else if (mode === "in") {
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
      // رسائل عامة لمنع كشف وجود الحسابات (account enumeration)
      if (forgot) {
        toast.success("إذا كان البريد مسجلاً، سيصلك رابط استعادة كلمة المرور ✉️");
        setForgot(false);
      } else if (mode === "up") {
        toast.error("تعذر إنشاء الحساب. تحقق من البيانات أو جرّب بريدًا آخر");
      } else {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }
      console.debug("[auth]", msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (redirect) sessionStorage.setItem("sooqy-redirect", redirect);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error("تعذر تسجيل الدخول عبر Google");
  };

  return (
    <div className="space-y-6 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link to="/" aria-label="رجوع" className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft">
        <ArrowRight className="size-5" />
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">SOOQY 🇩🇿</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reset ? "تعيين كلمة مرور جديدة"
            : forgot ? "استعادة كلمة المرور"
            : mode === "in" ? "مرحباً بعودتك" : "أنشئ حسابك خلال ثوانٍ"}
        </p>
      </div>

      {!reset && !forgot && (
        <>
          <button onClick={google} className="w-full rounded-2xl border bg-card py-3 font-bold shadow-soft">
            المتابعة باستخدام Google
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        {!reset && !forgot && mode === "up" && (
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="h-12 w-full rounded-xl border bg-card px-3" />
        )}
        {!reset && (
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="h-12 w-full rounded-xl border bg-card px-3" />
        )}
        {forgot ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
          </p>
        ) : reset ? (
          <>
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" className="h-12 w-full rounded-xl border bg-card px-3" />
            <input required type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" className="h-12 w-full rounded-xl border bg-card px-3" />
          </>
        ) : (
          <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" className="h-12 w-full rounded-xl border bg-card px-3" />
        )}
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "جارٍ المعالجة..." : reset ? "حفظ كلمة المرور الجديدة" : forgot ? "إرسال رابط الاستعادة" : mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}
        </button>
      </form>

      {!reset && !forgot && (
        <>
          {mode === "in" && (
            <button onClick={() => setForgot(true)} className="w-full text-center text-xs font-semibold text-muted-foreground underline">
              نسيت كلمة المرور؟
            </button>
          )}
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm font-semibold text-primary">
            {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً جديداً" : "لديك حساب؟ سجّل الدخول"}
          </button>
        </>
      )}
      {forgot && (
        <button onClick={() => setForgot(false)} className="w-full text-sm font-semibold text-primary">
          العودة لتسجيل الدخول
        </button>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        بالمتابعة فإنك توافق على <Link to="/terms" className="underline">شروط الاستخدام</Link>
      </p>
    </div>
  );
}