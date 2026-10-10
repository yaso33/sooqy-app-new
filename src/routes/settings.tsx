import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { User, Bell, MapPin, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — SooQy" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      await qc.invalidateQueries();
      navigate({ to: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-28 pt-4">
        <PageHeader title="الإعدادات" back />
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-body text-muted-foreground">يرجى تسجيل الدخول للوصول إلى الإعدادات</p>
          <Link to="/auth" className="btn-primary mt-4 w-full">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const name = (user.user_metadata?.["full_name"] as string | undefined) ?? "مستخدم SooQy";
  const email = user.email ?? "";
  const initial = (email || "؟").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-4">
      <PageHeader title="الإعدادات" back />

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary-soft-foreground">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-h3 text-foreground">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
          <Link to="/profile" className="text-sm font-bold text-primary">
            تعديل
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <MenuItem icon={User} label="الملف الشخصي" to="/profile" />
        <MenuItem icon={Bell} label="الإشعارات" to="/notifications" />
        <MenuItem icon={MapPin} label="الاسم والولاية والعنوان" to="/profile" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={signOut}
          disabled={loading}
          className="flex w-full items-center gap-3 p-4 text-right hover:bg-muted/50 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5 text-destructive" />
          <span className="flex-1 text-destructive">
            {loading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-right hover:bg-muted/50"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1 text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
