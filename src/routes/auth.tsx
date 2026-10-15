import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

// رابط عودة OAuth: في التطبيق الأصلي deep link مخصص يعيد فتح التطبيق،
// وفي الويب مسار /auth/callback العادي (مع حماية من بيئة SSR بلا window).
const AUTH_REDIRECT_URL = Capacitor.isNativePlatform()
  ? "com.sooqy.app://auth/callback"
  : typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "http://localhost/auth/callback";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string | undefined; reset?: boolean } => ({
    redirect:
      typeof s["redirect"] === "string" &&
      s["redirect"].startsWith("/") &&
      !s["redirect"].startsWith("//")
        ? s["redirect"]
        : undefined,
    reset: s["reset"] === "1" || s["reset"] === true || s["reset"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — SOOQY" },
      {
        name: "description",
        content: "سجّل الدخول إلى حسابك في SOOQY لحجز المنتجات وتتبع طلباتك.",
      },
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
  const { t } = useTranslation();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !reset) navigate({ to: (redirect ?? "/") as "/", replace: true });
  }, [user, redirect, navigate, reset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reset && password !== confirm) {
      toast.error(t("passwords_do_not_match"));
      return;
    }
    setBusy(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${AUTH_REDIRECT_URL}?reset=1`,
        });
        if (error) throw error;
        toast.success(t("reset_link_sent"));
        setForgot(false);
      } else if (reset) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success(t("password_updated"));
        navigate({ to: "/", replace: true });
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: AUTH_REDIRECT_URL, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success(t("account_created"));
      }
    } catch (err) {
      const msg = (err as Error).message;
      // رسائل عامة لمنع كشف وجود الحسابات (account enumeration)
      if (forgot) {
        toast.success(t("email_registered"));
        setForgot(false);
      } else if (mode === "up") {
        toast.error(t("account_creation_failed"));
      } else {
        toast.error(t("invalid_credentials"));
      }
      console.debug("[auth]", msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (redirect) sessionStorage.setItem("sooqy-redirect", redirect);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: AUTH_REDIRECT_URL,
        // في التطبيق الأصلي لا نوجّه WebView نفسه إلى Google؛ نفتح تبويبًا مخصصًا
        // ونستقبل النتيجة عبر deep link (appUrlOpen).
        skipBrowserRedirect: Capacitor.isNativePlatform(),
      },
    });
    if (error || !data.url) {
      toast.error(t("error"));
      return;
    }
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: data.url });
    }
  };

  return (
    <div className="space-y-6 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link
        to="/"
        aria-label="رجوع"
        className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft"
      >
        <ArrowRight className="size-5" />
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">{t("app_name")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reset
            ? t("reset_password")
            : forgot
              ? t("forgot_password")
              : mode === "in"
                ? t("welcome_back")
                : t("sign_up")}
        </p>
      </div>

      {!reset && !forgot && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="w-full rounded-2xl border bg-card py-3 font-bold shadow-soft disabled:opacity-50"
          >
            {busy ? t("loading") : t("sign_in")}
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("or")}{" "}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        {!reset && !forgot && mode === "up" && (
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("enter_name")}
            className="h-12 w-full rounded-xl border bg-card px-3"
          />
        )}
        {!reset && (
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("enter_email")}
            className="h-12 w-full rounded-xl border bg-card px-3"
          />
        )}
        {forgot ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{t("verify_email")}</p>
        ) : reset ? (
          <>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("enter_password")}
                className="h-12 w-full rounded-xl border bg-card px-3 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? t("hide_password") : t("show_password")}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("confirm_password")}
                className="h-12 w-full rounded-xl border bg-card px-3 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? t("hide_password") : t("show_password")}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </>
        ) : (
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("enter_password")}
              className="h-12 w-full rounded-xl border bg-card px-3 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? t("hide_password") : t("show_password")}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        )}
        <button
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy
            ? t("loading")
            : reset
              ? t("save")
              : forgot
                ? t("send")
                : mode === "in"
                  ? t("sign_in")
                  : t("sign_up")}
        </button>
      </form>

      {!reset && !forgot && (
        <>
          {mode === "in" && (
            <button
              onClick={() => setForgot(true)}
              className="w-full text-center text-xs font-semibold text-muted-foreground underline"
            >
              {t("forgot_password")}
            </button>
          )}
          <button
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="w-full text-sm font-semibold text-primary"
          >
            {mode === "in" ? t("create_account_prompt") : t("already_have_account")}
          </button>
        </>
      )}
      {forgot && (
        <button
          onClick={() => setForgot(false)}
          className="w-full text-sm font-semibold text-primary"
        >
          {t("sign_in")}
        </button>
      )}

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("terms_agreement")}{" "}
        <Link to="/terms" className="underline">
          {t("terms")}
        </Link>{" "}
        {t("and")}
        <Link to="/privacy" className="underline">
          {t("privacy")}
        </Link>
      </p>
    </div>
  );
}
