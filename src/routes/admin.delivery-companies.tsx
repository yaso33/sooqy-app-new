import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/delivery-companies")({
  head: () => ({
    meta: [{ title: "إدارة شركات التوصيل — SOOQY" }],
  }),
  component: AdminDeliveryCompaniesPage,
});

function AdminDeliveryCompaniesPage() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();

  const roleQuery = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return "customer";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role ?? "customer";
    },
    enabled: !!user && ready,
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-delivery-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_companies")
        .select("*, user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && ready,
  });

  if (!ready) return null;
  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-h1 text-foreground">سجّل الدخول كمدير المنصة</h1>
        <Link to="/auth" search={{ redirect: "/admin/delivery-companies" }} className="btn-primary">
          دخول
        </Link>
      </div>
    );
  }

  if (roleQuery.isLoading)
    return <div className="m-4 h-64 animate-pulse rounded-2xl border border-border bg-card" />;

  // التحقق من دور المشرف
  if (roleQuery.data !== "admin") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldCheck className="size-12 text-muted-foreground" />
        <h1 className="text-h1 text-foreground">غير مسموح بالدخول</h1>
        <p className="text-body text-muted-foreground">هذه الصفحة مخصصة لمديري المنصة فقط.</p>
        <Link to="/" className="btn-primary mt-4">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="m-4 h-64 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  const handleToggleApproval = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("delivery_companies")
      .update({ is_approved: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("تعذر تحديث حالة الاعتماد");
      return;
    }
    toast.success(`تم ${!current ? "اعتماد" : "إلغاء اعتماد"} الشركة بنجاح`);
    qc.invalidateQueries({ queryKey: ["admin-delivery-companies"] });
  };

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="flex items-center gap-2 py-1">
        <button onClick={() => window.history.back()} aria-label="رجوع" className="icon-btn">
          <ArrowRight className="size-5" />
        </button>
        <h1 className="text-h1 text-foreground">إدارة شركات التوصيل</h1>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-body text-muted-foreground mb-4">
          قائمة شركات التوصيل المسجلة. اعتمد الشركات لتتمكن من استقبال طلبات الشحن داخل التطبيق.
        </p>

        {companies?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد شركات توصيل مسجلة بعد.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex shrink-0 items-center justify-center size-8 rounded-full bg-primary/10 text-primary">
                    <UserPlus className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {company.company_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {company.contact_phone} · {company.email ?? "—"}
                    </p>
                    {company.license_number && (
                      <p className="text-xs text-muted-foreground truncate">
                        السجل التجاري: {company.license_number}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeStatus isApproved={company.is_approved} />
                  <button
                    onClick={() => handleToggleApproval(company.id, company.is_approved)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-soft",
                      company.is_approved
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-primary/10 text-primary hover:bg-primary",
                    )}
                  >
                    {company.is_approved ? "إلغاء الاعتماد" : "اعتماد"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link to="/" className="btn-secondary w-full">
        <ArrowRight className="size-4" /> العودة للرئيسية
      </Link>
    </div>
  );
}

function BadgeStatus({ isApproved }: { isApproved: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isApproved
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      )}
    >
      {isApproved ? "معتمد" : "قيد المراجعة"}
    </span>
  );
}
