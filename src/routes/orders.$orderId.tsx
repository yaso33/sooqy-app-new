import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MapPin, Package, Truck, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatDA } from "@/lib/geo";
import { fetchMyOrders } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [{ title: "تتبع الطلب — SooQy" }],
  }),
  component: TrackPage,
});

const STEPS = [
  { id: "pending", label: "قيد الانتظار", desc: "تم استلام طلبك وهو بانتظار تأكيد التاجر." },
  { id: "confirmed", label: "تم التأكيد", desc: "أكد التاجر الطلب وجارٍ تجهيزه." },
  { id: "shipped", label: "قيد التوصيل", desc: "الطلب في الطريق إليك." },
  { id: "delivered", label: "تم التوصيل", desc: "وصل طلبك إلى باب منزلك. استمتع! 🎉" },
] as const;

function trackCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function TrackPage() {
  const { orderId } = Route.useParams();
  const { user, ready } = useAuth();
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: fetchMyOrders, enabled: !!user });

  if (!ready) return null;
  const order = orders.data?.find((o) => o.id === orderId);

  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-h1 text-foreground">سجّل الدخول لتتبع طلبك</h1>
        <Link to="/auth" search={{ redirect: `/orders/${orderId}` }} className="btn-primary">
          دخول
        </Link>
      </div>
    );
  }

  if (orders.isLoading && !order) {
    return <div className="m-4 h-64 animate-pulse rounded-2xl border border-border bg-card" />;
  }
  if (!order) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-body text-muted-foreground">لم نعثر على هذا الطلب.</p>
        <Link to="/orders" className="btn-secondary mt-4">
          طلباتي
        </Link>
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const statusIdx = STEPS.findIndex((s) => s.id === order.status);
  const date = new Date(order.created_at).toLocaleDateString("ar-DZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="flex items-center gap-2 py-1">
        <button onClick={() => window.history.back()} aria-label="رجوع" className="icon-btn">
          <ArrowRight className="size-5" />
        </button>
        <h1 className="text-h1 text-foreground">تتبع الطلب</h1>
      </header>

      {/* رمز التتبع */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">طلب #{trackCode(order.id)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-background p-3">
          <span className="text-sm font-semibold text-muted-foreground">الإجمالي</span>
          <b className="text-price text-primary">{formatDA(order.total)}</b>
        </div>
      </div>

      {/* الخط الزمني */}
      {cancelled ? (
        <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <XCircle className="size-6 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-bold text-danger">تم إلغاء هذا الطلب</p>
            <p className="text-xs text-muted-foreground">تواصل مع التاجر لمعرفة التفاصيل.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <ol className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= statusIdx;
              const current = i === statusIdx;
              return (
                <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn(
                        "absolute top-7 right-[15px] h-[calc(100%-28px)] w-0.5 rounded-full",
                        i < statusIdx ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-700",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-neutral-300 bg-card text-muted-foreground dark:border-neutral-600",
                    )}
                  >
                    {done ? <Check className="size-4" /> : <Package className="size-4" />}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className={cn("text-sm font-bold", current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                      {current && <span className="mr-2 text-[10px] font-semibold text-primary">● الحالي</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* التفاصيل */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-h3 text-foreground">تفاصيل الطلب</h2>
        <div className="space-y-1.5">
          {(order.items ?? []).map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="line-clamp-1 font-semibold text-foreground">
                {it.product_name} <span className="text-muted-foreground">× {it.quantity}</span>
              </span>
              <span className="shrink-0 font-bold text-ink">{formatDA(it.unit_price * it.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>المجموع الفرعي</span>
            <span>{formatDA(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>التوصيل</span>
            <span>{formatDA(order.shipping_fee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>طريقة الدفع</span>
            <span>{order.payment_method === "cod" ? "الدفع عند الاستلام" : "BaridiMob"}</span>
          </div>
        </div>
      </div>

      {/* العنوان */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-bold text-foreground">{order.full_name}</p>
          <p className="mt-0.5 text-muted-foreground">
            {order.wilaya?.name_ar ?? `الولاية ${order.wilaya_id}`} · {order.commune}
            {order.address_line ? ` · ${order.address_line}` : ""}
          </p>
          <p className="mt-0.5 text-muted-foreground">{order.phone}</p>
        </div>
      </div>

      <Link to="/explore" className="btn-secondary w-full">
        <Truck className="size-4" /> مواصلة التسوق
      </Link>
    </div>
  );
}