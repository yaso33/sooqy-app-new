import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Package,
  ShoppingBag,
  Store as StoreIcon,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  role: string;
};

type StoreRow = {
  id: string;
  name: string;
  wilaya_id: number;
  created_at: string;
  is_active: boolean;
};

type CompanyRow = {
  id: string;
  company_name: string;
  contact_phone: string;
  is_approved: boolean;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  merchant: "متجر",
  customer: "عميل",
  delivery_company: "شركة توصيل",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  merchant: "bg-indigo-100 text-indigo-700",
  customer: "bg-green-100 text-green-700",
  delivery_company: "bg-amber-100 text-amber-700",
};

function BadgeRole({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
        ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700",
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function BadgeApproved({ approved }: { approved: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
        approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
      )}
    >
      {approved ? <Check className="size-3" /> : <Clock className="size-3" />}
      {approved ? "معتمد" : "قيد المراجعة"}
    </span>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
      <div className={cn("flex size-12 items-center justify-center rounded-xl", color)}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-sm text-ink-2">{title}</p>
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "stores" | "companies">(
    "overview",
  );

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, stores, orders, companies] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("delivery_companies").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        stores: stores.count ?? 0,
        orders: orders.count ?? 0,
        companies: companies.count ?? 0,
      };
    },
    enabled: !!user,
  });

  const usersList = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const ids = (profiles ?? []).map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);

      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) ?? "customer",
      }));
    },
    enabled: !!user && activeTab === "users",
  });

  const storesList = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, wilaya_id, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as StoreRow[];
    },
    enabled: !!user && activeTab === "stores",
  });

  const companiesList = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_companies")
        .select("id, company_name, contact_phone, is_approved, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CompanyRow[];
    },
    enabled: !!user && activeTab === "companies",
  });

  const roleQuery = useQuery({
    queryKey: ["admin-role-check", user?.id],
    queryFn: async () => {
      if (!user) return "customer";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role ?? "customer";
    },
    enabled: !!user,
  });

  const handleToggleCompany = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("delivery_companies")
      .update({ is_approved: !current })
      .eq("id", id);
    if (error) {
      toast.error("حدث خطأ، حاول مرة أخرى");
      return;
    }
    toast.success(`تم ${!current ? "اعتماد" : "إلغاء اعتماد"} الشركة`);
    queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  if (!ready) return null;

  if (!user) {
    return (
      <div className="p-6 text-center">
        <PageHeader title="لوحة الإدارة" back="/" />
        <p className="mt-8 text-ink-2">سجّل الدخول للوصول إلى لوحة الإدارة</p>
        <Link to="/auth" className="btn-primary mt-4 inline-block">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (roleQuery.isLoading) return <div className="p-6 text-center text-ink-2">جاري التحقق...</div>;

  if (roleQuery.data !== "admin") {
    return (
      <div className="p-6 text-center">
        <PageHeader title="لوحة الإدارة" back="/" />
        <p className="mt-8 text-red-600">ليس لديك صلاحية الوصول إلى لوحة الإدارة</p>
        <Link to="/" className="btn-secondary mt-4 inline-block">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "نظرة عامة" },
    { key: "users", label: "المستخدمون" },
    { key: "stores", label: "المتاجر" },
    { key: "companies", label: "شركات التوصيل" },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16">
      <PageHeader title="لوحة الإدارة" back="/" />

      {/* تبويبات */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 shadow-soft">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition",
              activeTab === t.key ? "bg-primary text-primary-foreground" : "text-ink-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* نظرة عامة */}
      {activeTab === "overview" && (
        <div className="mt-4 space-y-3">
          <StatCard
            icon={Users}
            title="المستخدمون"
            value={stats.data?.users ?? "..."}
            color="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            icon={StoreIcon}
            title="المتاجر"
            value={stats.data?.stores ?? "..."}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            icon={Package}
            title="الطلبات"
            value={stats.data?.orders ?? "..."}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={Truck}
            title="شركات التوصيل"
            value={stats.data?.companies ?? "..."}
            color="bg-amber-50 text-amber-600"
          />

          <Link
            to="/admin/delivery-companies"
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface p-4 shadow-soft transition hover:shadow-lift"
          >
            <div className="flex items-center gap-3">
              <Truck className="size-5 text-primary" />
              <span className="font-bold">إدارة شركات التوصيل</span>
            </div>
            <ArrowLeft className="size-4 text-ink-3" />
          </Link>
        </div>
      )}

      {/* المستخدمون */}
      {activeTab === "users" && (
        <div className="mt-4 space-y-3">
          {usersList.isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          )}
          {usersList.data?.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{u.full_name ?? "بدون اسم"}</p>
                  <p className="text-xs text-ink-2">{u.phone ?? u.user_id.slice(0, 8)}</p>
                </div>
              </div>
              <BadgeRole role={u.role} />
            </div>
          ))}
        </div>
      )}

      {/* المتاجر */}
      {activeTab === "stores" && (
        <div className="mt-4 space-y-3">
          {storesList.isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          )}
          {storesList.data?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-50">
                  <StoreIcon className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-ink-2">ولاية {s.wilaya_id}</p>
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  s.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                )}
              >
                {s.is_active ? "نشط" : "موقوف"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* شركات التوصيل */}
      {activeTab === "companies" && (
        <div className="mt-4 space-y-3">
          {companiesList.isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          )}
          {companiesList.data?.length === 0 && (
            <div className="rounded-xl bg-surface p-8 text-center text-ink-2 shadow-soft">
              لا توجد شركات توصيل مسجلة بعد
            </div>
          )}
          {companiesList.data?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-50">
                  <Truck className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold">{c.company_name}</p>
                  <p className="text-xs text-ink-2">{c.contact_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BadgeApproved approved={c.is_approved} />
                <button
                  onClick={() => handleToggleCompany(c.id, c.is_approved)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-bold transition",
                    c.is_approved
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100",
                  )}
                >
                  {c.is_approved ? <X className="size-4" /> : <Check className="size-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
