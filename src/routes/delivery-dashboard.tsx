import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Check, Truck, X, Clock, PackageCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  fetchMyDeliveryCompany,
  fetchPendingShipmentsForCompany,
  fetchShipmentsByCompany,
  updateShipmentStatus,
  SHIPMENT_STATUS_LABELS,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/delivery";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/delivery-dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة شركة التوصيل — SOOQY" },
      {
        name: "description",
        content: "إدارة طلبات الشحن، قبولها أو رفضها، وتحديث حالات التوصيل لشركة التوصيل في SOOQY.",
      },
    ],
  }),
  component: DeliveryDashboardPage,
});

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: "bg-amber-soft text-amber-soft-foreground border-amber-border",
  accepted: "bg-blue-soft text-blue-soft-foreground border-blue-border",
  picked_up: "bg-indigo-soft text-indigo-soft-foreground border-indigo-border",
  in_transit: "bg-purple-soft text-purple-soft-foreground border-purple-border",
  delivered: "bg-green-soft text-green-soft-foreground border-green-border",
  failed: "bg-orange-soft text-orange-soft-foreground border-orange-border",
  returned: "bg-rose-soft text-rose-soft-foreground border-rose-border",
  rejected: "bg-muted text-muted-foreground border-border",
};

function DeliveryDashboardPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  // جميع hooks تُستدعى دائمًا (ليس مشروطًا) لاحترام قواعد React Hooks
  const company = useQuery({
    queryKey: ["my-delivery-company", user?.id ?? ""],
    queryFn: () => fetchMyDeliveryCompany(user!.id),
    enabled: !!ready && !!user,
  });

  const pendingShipments = useQuery({
    queryKey: ["pending-shipments", company.data?.id ?? ""],
    queryFn: () => fetchPendingShipmentsForCompany(company.data!.id),
    enabled: !!ready && !!company.data && !company.data.is_approved,
  });

  const allShipments = useQuery({
    queryKey: ["all-shipments", company.data?.id ?? ""],
    queryFn: () => fetchShipmentsByCompany(company.data!.id),
    enabled: !!ready && !!company.data,
  });

  const shipments: Shipment[] =
    activeTab === "pending" ? (pendingShipments.data ?? []) : (allShipments.data ?? []);

  const handleDecision = async (shipmentId: string, decision: "accept" | "reject") => {
    if (
      !confirm(decision === "accept" ? "هل تريد قبول طلب الشحن هذا؟" : "هل تريد رفض طلب الشحن هذا؟")
    )
      return;
    try {
      await updateShipmentStatus(
        shipmentId,
        decision === "accept" ? "accepted" : "rejected",
        decision === "reject" ? "تم الرفض من قبل شركة التوصيل" : undefined,
      );
      toast.success(decision === "accept" ? "تم قبول طلب الشحن ✅" : "تم رفض طلب الشحن ❌");
      qc.invalidateQueries({ queryKey: ["pending-shipments"] });
      qc.invalidateQueries({ queryKey: ["all-shipments"] });
    } catch (error) {
      toast.error("تعذر تحديث الحالة. أعد المحاولة.");
    }
  };

  const handleStatusUpdate = async (shipmentId: string, status: ShipmentStatus) => {
    try {
      await updateShipmentStatus(shipmentId, status);
      toast.success(`تم تحديث الحالة إلى: ${SHIPMENT_STATUS_LABELS[status]} ✅`);
      qc.invalidateQueries({ queryKey: ["all-shipments"] });
      qc.invalidateQueries({ queryKey: ["pending-shipments"] });
    } catch (error) {
      toast.error("تعذر تحديث الحالة. أعد المحاولة.");
    }
  };

  if (!ready) return null;

  if (!user) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <Truck className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold">تحتاج لدخول الحساب</h1>
        <p className="text-sm text-muted-foreground">لدخول لوحة شركة التوصيل، سجّل الدخول أولاً.</p>
        <Link
          to="/auth"
          search={{ redirect: "/delivery-dashboard" }}
          className="inline-block rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground"
        >
          دخول
        </Link>
      </div>
    );
  }

  if (!company.data) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <AlertCircle className="mx-auto size-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">لا يوجد حساب شركة توصيل</h1>
        <p className="text-sm text-muted-foreground">
          لم يتم العثور على حساب شركة توصيل مرتبط بحسابك.
        </p>
        <Link
          to="/delivery-register"
          className="inline-block rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground"
        >
          تسجيل شركة توصيل جديدة
        </Link>
      </div>
    );
  }

  if (!company.data.is_approved) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <Clock className="mx-auto size-12 text-amber-500" />
        <h1 className="text-2xl font-bold">حسابك قيد المراجعة</h1>
        <p className="text-sm text-muted-foreground">
          تم إرسال طلب تسجيل شركتك ({company.data.company_name}) وسيتم تفعيله بعد مراجعة إدارة
          المنصة واعتماده.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          يمكنك متابعة حالة الطلب من خلال التواصل مع دعم المنصة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-32 pt-5">
      <PageHeader title="لوحة شركة التوصيل" subtitle={company.data.company_name} back="/" />

      {/* بطاقة ملخص الشركة */}
      <section className="rounded-3xl bg-card p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">نظرة عامة</h2>
            <p className="text-xs text-muted-foreground">
              إدارة طلبات الشحن الخاصة بشركة {company.data.company_name}
            </p>
          </div>
          <BadgeCompany status={company.data.is_approved ? "active" : "pending"} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="طلبات جديدة قيد الانتظار"
            value={pendingShipments.data?.length ?? 0}
            icon={PackageCheck}
            color="text-amber-500"
          />
          <StatCard
            label="إجمالي الشحنات"
            value={allShipments.data?.length ?? 0}
            icon={Truck}
            color="text-primary"
          />
          <StatCard
            label="تم التسليم"
            value={allShipments.data?.filter((s) => s.status === "delivered").length ?? 0}
            icon={Check}
            color="text-green-500"
          />
          <StatCard
            label="تعذر التسليم"
            value={allShipments.data?.filter((s) => s.status === "failed").length ?? 0}
            icon={X}
            color="text-rose-500"
          />
        </div>
      </section>

      {/* التبويبات */}
      <section className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex gap-1 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition",
              activeTab === "pending"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            طلبات جديدة ({pendingShipments.data?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition",
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            جميع الشحنات ({allShipments.data?.length ?? 0})
          </button>
        </div>

        {activeTab === "pending" ? (
          <PendingShipmentsList shipments={shipments} onDecision={handleDecision} />
        ) : (
          <AllShipmentsList shipments={shipments} onStatusUpdate={handleStatusUpdate} />
        )}
      </section>
    </div>
  );
}

function BadgeCompany({ status }: { status: "active" | "pending" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        status === "active"
          ? "bg-green-soft text-green-soft-foreground"
          : "bg-amber-soft text-amber-soft-foreground",
      )}
    >
      {status === "active" ? "مفعل" : "قيد المراجعة"}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="size-6 shrink-0" />
      </div>
    </div>
  );
}

function PendingShipmentsList({
  shipments,
  onDecision,
}: {
  shipments: Shipment[];
  onDecision: (id: string, decision: "accept" | "reject") => void;
}) {
  if (shipments.length === 0) {
    return (
      <div className="mt-6 text-center py-10">
        <PackageCheck className="mx-auto size-16 text-muted-foreground/50" />
        <h3 className="mt-3 text-lg font-bold">لا توجد طلبات شحن جديدة</h3>
        <p className="text-sm text-muted-foreground">
          عندما يرسل متجر طلب شحن إلى شركتك، سيظهر هنا لاتخاذ قرار بشأنه.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {shipments.map((shipment) => (
        <div key={shipment.id} className="rounded-2xl border p-4 bg-card shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">طلب شحن #{shipment.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground truncate">
                الطلب رقم: {shipment.order_id.slice(0, 8)}
              </p>
              {shipment.recipient_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  المستلم: {shipment.recipient_name}
                </p>
              )}
              {shipment.recipient_phone && (
                <p className="text-sm text-muted-foreground">الهاتف: {shipment.recipient_phone}</p>
              )}
              {shipment.delivery_address && (
                <p className="text-sm text-muted-foreground">
                  العنوان: {shipment.delivery_address}
                </p>
              )}
              {shipment.fee != null && (
                <p className="text-sm font-medium text-primary mt-1">الرسوم: {shipment.fee} دج</p>
              )}
            </div>
            <BadgeStatus status={shipment.status} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onDecision(shipment.id, "accept")}
              className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Check className="mr-1.5 size-4" /> قبول
            </button>
            <button
              onClick={() => onDecision(shipment.id, "reject")}
              className="rounded-xl bg-rose-soft px-4 py-2 text-sm font-bold text-rose-soft-foreground hover:bg-rose-soft/80 transition"
            >
              <X className="mr-1.5 size-4" /> رفض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AllShipmentsList({
  shipments,
  onStatusUpdate,
}: {
  shipments: Shipment[];
  onStatusUpdate: (id: string, status: ShipmentStatus) => void;
}) {
  if (shipments.length === 0) {
    return (
      <div className="mt-6 text-center py-10">
        <Truck className="mx-auto size-16 text-muted-foreground/50" />
        <h3 className="mt-3 text-lg font-bold">لا توجد شحنات مسجلة</h3>
        <p className="text-sm text-muted-foreground">
          ستظهر الشحنات هنا عندما يختار المتاجر شركتك للتوصيل وتقبل الطلبات.
        </p>
      </div>
    );
  }

  const statusOptions: ShipmentStatus[] = [
    "picked_up",
    "in_transit",
    "delivered",
    "failed",
    "returned",
  ];

  return (
    <div className="mt-4 space-y-3">
      {shipments.map((shipment) => {
        const currentStatus = shipment.status as ShipmentStatus;
        const canUpdate =
          currentStatus === "accepted" ||
          currentStatus === "picked_up" ||
          currentStatus === "in_transit";

        return (
          <div key={shipment.id} className="rounded-2xl border p-4 bg-card shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">شحنة #{shipment.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  الطلب رقم: {shipment.order_id.slice(0, 8)}
                </p>
                {shipment.recipient_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    المستلم: {shipment.recipient_name}
                  </p>
                )}
                {shipment.recipient_phone && (
                  <p className="text-sm text-muted-foreground">
                    الهاتف: {shipment.recipient_phone}
                  </p>
                )}
                {shipment.delivery_address && (
                  <p className="text-sm text-muted-foreground">
                    العنوان: {shipment.delivery_address}
                  </p>
                )}
                {shipment.fee != null && (
                  <p className="text-sm font-medium text-primary mt-1">الرسوم: {shipment.fee} دج</p>
                )}
              </div>
              <BadgeStatus status={currentStatus} />
            </div>

            {canUpdate && (
              <div className="mt-4 flex flex-wrap gap-2">
                {statusOptions.map((status) => {
                  if (
                    (currentStatus === "accepted" && status !== "picked_up") ||
                    (currentStatus === "picked_up" && status !== "in_transit") ||
                    (currentStatus === "in_transit" &&
                      !["delivered", "failed", "returned"].includes(status))
                  )
                    return null;
                  return (
                    <button
                      key={status}
                      onClick={() => onStatusUpdate(shipment.id, status)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                        STATUS_COLORS[status],
                      )}
                    >
                      {SHIPMENT_STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  const label = SHIPMENT_STATUS_LABELS[status as ShipmentStatus] || status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border",
        STATUS_COLORS[status as ShipmentStatus] || "border-border",
      )}
    >
      {label}
    </span>
  );
}
