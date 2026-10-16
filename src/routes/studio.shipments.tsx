import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Check, Truck, X, Clock, PackageCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchShipmentsByStore } from "@/lib/delivery";
import { SHIPMENT_STATUS_LABELS } from "@/lib/delivery";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/shipments")({
  component: StudioShipmentsPage,
});

function StudioShipmentsPage() {
  const { user, ready } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const storeId = (user?.user_metadata as { store_id?: string })?.store_id;

  const {
    data: shipments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["store-shipments", storeId, statusFilter],
    queryFn: async () => {
      if (!storeId) return [];
      const all = await fetchShipmentsByStore(storeId);
      if (statusFilter) return all.filter((s) => s.status === statusFilter);
      return all;
    },
    enabled: ready && !!user && !!storeId,
  });

  if (!ready) return null;
  if (!user) {
    return (
      <div className="p-6 text-center">
        <PageHeader title="الشحنات" back="/studio/settings" />
        <div className="text-red-600">سجّل الدخول لعرض شحنات متجرك</div>
        <Link to="/auth" className="btn-primary mt-4 inline-block">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <PageHeader title="الشحنات" back="/studio/settings" />
        <div className="text-red-600">حدث خطأ أثناء تحميل الشحنات</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <PageHeader title="الشحنات" back="/studio/settings" />
        <div className="animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="p-6 text-center">
        <PageHeader title="الشحنات" back="/studio/settings" />
        <div className="text-red-600">لا يوجد متجر مرتبط بهذا الحساب</div>
      </div>
    );
  }

  const statusCounts = {
    pending: shipments.filter((s) => s.status === "pending").length,
    accepted: shipments.filter((s) => s.status === "accepted").length,
    picked_up: shipments.filter((s) => s.status === "picked_up").length,
    in_transit: shipments.filter((s) => s.status === "in_transit").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
    failed: shipments.filter((s) => s.status === "failed").length,
    returned: shipments.filter((s) => s.status === "returned").length,
  };

  const filteredShipments = statusFilter
    ? shipments.filter((s) => s.status === statusFilter)
    : shipments;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="الشحنات" back="/studio/settings" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ملخص الحالات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { key: null, label: "الجميع", count: shipments.length, color: "bg-primary text-white" },
            {
              key: "pending",
              label: "قيد الانتظار",
              count: statusCounts.pending,
              color: "bg-yellow-100 text-yellow-800",
            },
            {
              key: "accepted",
              label: "تم القبول",
              count: statusCounts.accepted,
              color: "bg-blue-100 text-blue-800",
            },
            {
              key: "picked_up",
              label: "تم الاستلام",
              count: statusCounts.picked_up,
              color: "bg-indigo-100 text-indigo-800",
            },
            {
              key: "in_transit",
              label: "قيد التوصيل",
              count: statusCounts.in_transit,
              color: "bg-purple-100 text-purple-800",
            },
            {
              key: "delivered",
              label: "تم التسليم",
              count: statusCounts.delivered,
              color: "bg-green-100 text-green-800",
            },
            {
              key: "failed",
              label: "تعذر التسليم",
              count: statusCounts.failed,
              color: "bg-red-100 text-red-800",
            },
            {
              key: "returned",
              label: "مرتجع",
              count: statusCounts.returned,
              color: "bg-gray-100 text-gray-800",
            },
          ].map((item) => (
            <button
              key={item.key ?? "all"}
              onClick={() => setStatusFilter(item.key ?? null)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                item.color,
                statusFilter === item.key ? "ring-2 ring-primary" : "",
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {/* قائمة الشحنات */}
        <div className="space-y-2">
          {filteredShipments.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-gray-500">
              لا توجد شحنات
            </div>
          ) : (
            filteredShipments.map((shipment) => (
              <ShipmentRow key={shipment.id} shipment={shipment} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    picked_up: "bg-indigo-100 text-indigo-800",
    in_transit: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    returned: "bg-gray-100 text-gray-800",
  };

  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", variants[status])}>
      {SHIPMENT_STATUS_LABELS[status as keyof typeof SHIPMENT_STATUS_LABELS] ?? status}
    </span>
  );
}

function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const order = shipment.order as
    { id: string; full_name: string; phone: string; total: number } | undefined;

  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-medium text-gray-900">{order?.full_name ?? "عميل"}</div>
          <div className="text-sm text-gray-500">
            طلب #{order?.id?.slice(-6) ?? shipment.id.slice(-6)}
          </div>
        </div>
        <BadgeStatus status={shipment.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
        <div className="text-gray-500">الهاتف</div>
        <div className="font-medium">{order?.phone ?? "—"}</div>
        <div className="text-gray-500">المبلغ</div>
        <div className="font-medium">{order?.total ?? 0} دج</div>
        <div className="text-gray-500">الشركة</div>
        <div className="font-medium">{shipment.company_id?.slice(-4) ?? "—"}</div>
        <div className="text-gray-500">تاريخ الإنشاء</div>
        <div className="font-medium">
          {new Date(shipment.created_at).toLocaleDateString("ar-DZ")}
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/orders/${order?.id}`}
          className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium text-center"
        >
          عرض الطلب
        </Link>
      </div>
    </div>
  );
}
