import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell,
  FileText,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/sooqy/page-header";
import { MenuCard, MenuRow, SectionTitle } from "@/components/sooqy/list-menu";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — SooQy" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      await qc.invalidateQueries();
      navigate({ to: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-28 pt-4">
        <PageHeader title="الإعدادات" back="/account" />
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
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-28 pt-4">
      <PageHeader title="الإعدادات" subtitle="خصّص تجربتك في SooQy" back="/account" />

      {/* بطاقة الحساب */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-h3 text-foreground">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
        <Link to="/profile" className="shrink-0 text-sm font-bold text-primary">
          تعديل
        </Link>
      </div>

      {/* مجموعة: الحساب */}
      <section className="space-y-2">
        <SectionTitle>الحساب</SectionTitle>
        <MenuCard>
          <MenuRow icon={User} label="معلومات الحساب" hint="الاسم، الهاتف، العنوان" to="/profile" />
          <MenuRow icon={Shield} label="الأمان وتسجيل الدخول" soon />
        </MenuCard>
      </section>

      {/* مجموعة: تفضيلات التطبيق */}
      <section className="space-y-2">
        <SectionTitle>تفضيلات التطبيق</SectionTitle>
        <MenuCard>
          <MenuRow icon={Bell} label="الإشعارات" hint="طلباتك وحصريات متجرك" to="/notifications" />
          <MenuRow icon={Globe} label="اللغة" hint="العربية" soon />
          <MenuRow icon={Moon} label="المظهر" hint="فاتح" soon />
        </MenuCard>
      </section>

      {/* مجموعة: المساعدة والخصوصية */}
      <section className="space-y-2">
        <SectionTitle>المساعدة والخصوصية</SectionTitle>
        <MenuCard>
          <MenuRow icon={HelpCircle} label="المساعدة والدعم" to="/help" />
          <MenuRow icon={FileText} label="الشروط وسياسة الخصوصية" to="/terms" />
          <MenuRow icon={Info} label="حول SooQy" to="/about" />
        </MenuCard>
      </section>

      {/* مجموعة: الإجراءات */}
      <section className="space-y-2">
        <SectionTitle>الإجراءات</SectionTitle>
        <MenuCard>
          <MenuRow
            icon={LogOut}
            label={signingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
            onClick={() => void signOut()}
          />
          <MenuRow
            icon={Trash2}
            label="حذف الحساب"
            danger
            onClick={() => setConfirmDelete(true)}
          />
        </MenuCard>
      </section>

      {/* أسفل الصفحة */}
      <p className="pt-2 text-center text-xs text-muted-foreground">SooQy · الإصدار التجريبي</p>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف الحساب"
        message="سيُحذف حسابك وبياناتك نهائيًا من SooQy، ولن تتمكن من استرجاعها. هل أنت متأكد؟"
        confirmLabel="حذف الحساب"
        busy={signingOut}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => supabase.auth.deleteUser().then(() => toast.success("تم حذف الحساب")).catch((e) => toast.error("فشل الحذف: " + e.message))}
      />
    </div>
  );
}
