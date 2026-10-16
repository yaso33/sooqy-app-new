import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  CreditCard,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useBag } from "@/lib/bag";
import { track } from "@/lib/analytics";
import { formatDA } from "@/lib/geo";
import {
  createOrderWithDelivery,
  getOffersByIds,
  isValidDzPhone,
  normalizePhone,
  primaryImage,
} from "@/lib/sooqy";
import { getShippingFee, type DeliveryType } from "@/lib/shipping";
import { fetchApprovedDeliveryCompanies } from "@/lib/delivery";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "الدفع — SOOQY" },
      { name: "description", content: "أكمل طلبك من المحلات الجزائرية." },
    ],
  }),
  component: CheckoutPage,
});

type PaymentMethod = "cod" | "baridimob";
const STEPS = ["السلع", "العنوان", "التوصيل", "الدفع"] as const;

function CheckoutPage() {
  const { user, ready } = useAuth();
  const bag = useBag();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("home");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [deliveryCompanyId, setDeliveryCompanyId] = useState<string | null>(null);
  const deliveryCompanies = useQuery({
    queryKey: ["delivery-companies"],
    queryFn: fetchApprovedDeliveryCompanies,
    enabled: deliveryType === "home",
  });
  const [fullName, setFullName] = useState(user?.user_metadata?.["full_name"] ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (bag.items.length > 0) track("begin_checkout", { count: bag.items.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const offers = useQuery({
    queryKey: ["checkout-offers", bag.items],
    queryFn: () => getOffersByIds(bag.items.map((i) => i.offerId)),
    enabled: bag.items.length > 0,
  });
  const rows = bag.items.map((item) => ({
    ...item,
    offer: offers.data?.find((offer) => offer.id === item.offerId),
  }));
  const subtotal = rows.reduce((sum, row) => sum + (row.offer?.price ?? 0) * row.quantity, 0);
  const shippingFee = wilayaId ? getShippingFee(wilayaId, deliveryType) : 0;
  const total = subtotal + shippingFee;

  // منتجات لم تعد متوفرة: محذوفة من المتجر، أو غير متاحة، أو كميتها غير كافية
  const problems = rows.filter(
    (row) => !row.offer || !row.offer.is_available || row.offer.stock_quantity < row.quantity,
  );

  const stepValid: Record<number, boolean> = {
    0: bag.items.length > 0 && !!offers.data && problems.length === 0,
    1: !!wilayaId && !!commune.trim() && !!fullName.trim() && isValidDzPhone(phone.trim()),
    2: true,
    3: deliveryType === "desk" || !!address.trim(), // عنوان التوصيل مطلوب عند التوصيل للمنزل
  };

  if (!ready) return null;
  if (!user) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <PackageCheck className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold">تحتاج لدخول الحساب</h1>
        <p className="text-sm text-muted-foreground">لإتمام الطلب، سجّل الدخول أولًا.</p>
        <Link
          to="/auth"
          search={{ redirect: "/checkout" }}
          className="inline-block rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground"
        >
          دخول
        </Link>
      </div>
    );
  }
  if (bag.items.length === 0 && !orderId) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <PackageCheck className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold">السلة فارغة</h1>
        <Link
          to="/explore"
          className="inline-block rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground"
        >
          تصفّح المنتجات
        </Link>
      </div>
    );
  }

  const placeOrder = async () => {
    if (submitting) return; // منع إنشاء طلبات مكررة عند النقر المتكرر
    if (!stepValid[3]) {
      toast.error("أكمل المعلومات المطلوبة قبل إرسال الطلب.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createOrderWithDelivery(
        bag.items,
        deliveryType,
        wilayaId!,
        commune.trim(),
        paymentMethod,
        null, // لا وصل دفع — الدفع عند الاستلام فقط حاليًا
        { fullName: fullName.trim(), phone: normalizePhone(phone.trim()), address: address.trim() },
        deliveryCompanyId,
      );
      setOrderId(id);
      bag.clear();
      qc.clear();
      track("place_order", { total, paymentMethod, deliveryType, wilayaId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إرسال الطلب.");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderId) return <SuccessScreen orderId={orderId} />;

  const goNext = () => {
    if (!stepValid[step]) {
      toast.error(
        step === 0
          ? offers.isLoading
            ? "جارٍ التحقق من توفّر المنتجات — انتظر لحظة."
            : offers.isError
              ? "تعذّر التحقق من توفّر المنتجات — أعد المحاولة."
              : "بعض المنتجات لم تعد متوفرة بالكمية المطلوبة — عدّل سلتك."
          : step === 1
            ? isValidDzPhone(phone.trim())
              ? "أكمل العنوان وبياناتك أولًا."
              : "أدخل رقم هاتف جزائري صحيح (يبدأ بـ 05 أو 06 أو 07 ثم 8 أرقام)."
            : deliveryType === "home"
              ? "أدخل عنوان التوصيل التفصيلي أولًا."
              : "أكمل المعلومات المطلوبة.",
      );
      return;
    }
    if (step === 3) {
      placeOrder();
    } else {
      setStep(step + 1);
      // قفزة فورية لأعلى النموذج عند الانتقال بين الخطوات (لا تمرير ناعم)
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  return (
    <div className="space-y-5 px-4 pb-32 pt-5">
      <PageHeader title="إتمام الطلب" subtitle="خطوات بسيطة حتى باب منزلك" />

      {/* شريط التقدم */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-bold transition",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                  i < step ? "bg-primary text-primary-foreground" : "bg-background/60",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden min-w-0 truncate sm:inline">{label}</span>
            </button>
          </div>
        ))}
      </div>

      {step === 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            <h2 className="font-bold">سلعك ({bag.count})</h2>
          </div>
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.offerId} className="flex gap-3 rounded-2xl bg-background p-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {row.offer && primaryImage(row.offer.images) && (
                    <img
                      src={primaryImage(row.offer.images)!}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold">
                    {row.offer?.product.name ?? "..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.offer?.store.name} · الكمية {row.quantity}
                  </p>
                </div>
                <p className="text-sm font-bold">
                  {formatDA((row.offer?.price ?? 0) * row.quantity)}
                </p>
              </div>
            ))}
          </div>
          {offers.isLoading && (
            <p className="mt-3 text-xs text-muted-foreground">جارٍ التحقق من توفّر المنتجات...</p>
          )}
          {offers.isError && (
            <button
              type="button"
              onClick={() => offers.refetch()}
              className="mt-3 w-full rounded-xl bg-danger-soft py-2 text-xs font-bold text-danger"
            >
              تعذّر التحقق من التوفّر — أعِد المحاولة
            </button>
          )}
          {problems.length > 0 && (
            <div className="mt-3 rounded-2xl bg-danger-soft p-3 text-xs font-semibold leading-relaxed text-danger">
              ⚠️ بعض المنتجات لم تعد متوفرة كما في سلتك:
              <ul className="mt-1 list-inside list-disc">
                {problems.map((p) => (
                  <li key={p.offerId}>
                    {p.offer
                      ? `${p.offer.product.name} — المتاح: ${p.offer.stock_quantity}`
                      : "منتج لم يعد متوفرًا في المتجر"}
                  </li>
                ))}
              </ul>
              عدّل الكميات من السلة ثم أعد المحاولة.
            </div>
          )}
          <Link
            to="/bag"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary"
          >
            تعديل السلة <ChevronLeft className="size-3.5" />
          </Link>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4 rounded-3xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <h2 className="font-bold">العنوان والولاية</h2>
          </div>
          <WilayaSelect value={wilayaId} onChange={setWilayaId} required className="h-12 w-full" />
          <input
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            placeholder="البلدية"
            required
            className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <div className="space-y-3 rounded-2xl bg-background p-3">
            <p className="text-xs font-bold text-muted-foreground">بيانات المشتري</p>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم الكامل"
              required
              className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الهاتف"
              required
              inputMode="tel"
              className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-3xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            <h2 className="font-bold">طريقة التوصيل</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: "home",
                  label: "توصيل للمنزل",
                  icon: "🏠",
                  fee: wilayaId ? getShippingFee(wilayaId, "home") : null,
                },
                { id: "desk", label: "استلام من المكتب", icon: "📍", fee: 0 },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDeliveryType(option.id)}
                className={cn(
                  "rounded-2xl border p-3 text-sm font-bold transition",
                  deliveryType === option.id
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <span className="block text-lg">{option.icon}</span>
                {option.label}
                <span className="mt-1 block text-[11px] font-medium opacity-70">
                  {option.fee == null
                    ? "يُحدد حسب الولاية"
                    : option.fee === 0
                      ? "مجاني"
                      : formatDA(option.fee)}
                </span>
              </button>
            ))}
          </div>
          {deliveryType === "home" && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  شركة التوصيل (اختياري)
                </label>
                <select
                  value={deliveryCompanyId ?? ""}
                  onChange={(e) => setDeliveryCompanyId(e.target.value || null)}
                  className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر شركة توصيل —</option>
                  {deliveryCompanies.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
                {deliveryCompanies.isLoading && (
                  <p className="text-xs text-muted-foreground">جارٍ تحميل الشركات...</p>
                )}
                {deliveryCompanies.data?.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    لا توجد شركات توصيل معتمدة حالياً.
                  </p>
                )}
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="عنوان التوصيل التفصيلي (مطلوب للتوصيل للمنزل)"
                rows={3}
                className="w-full rounded-xl border bg-background px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </>
          )}
          <p className="flex items-start gap-2 rounded-2xl bg-primary-soft/70 p-3 text-xs leading-relaxed text-muted-foreground">
            <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
            رسوم التوصيل تُحسب حسب الولاية وتظهر شفافة في الملخص أسفل الشاشة.
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <h2 className="font-bold">طريقة الدفع</h2>
          </div>
          {(
            [
              { id: "cod", label: "الدفع عند الاستلام", icon: CreditCard, soon: false },
              { id: "baridimob", label: "BaridiMob (بريدي موب)", icon: Upload, soon: true },
            ] as const
          ).map(({ id, label, icon: Icon, soon }) => (
            <button
              key={id}
              type="button"
              disabled={soon}
              aria-disabled={soon}
              onClick={() => {
                if (soon) {
                  toast.info("الدفع عبر بريدي موب قادم قريبًا 🔜");
                  return;
                }
                setPaymentMethod(id);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border p-3 text-right transition",
                soon
                  ? "cursor-not-allowed border-dashed border-border bg-muted/40 opacity-70"
                  : paymentMethod === id
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card",
              )}
            >
              <span className="flex items-center gap-2 font-bold">
                <Icon className="size-4" />
                {label}
              </span>
              {soon ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                  قريبًا
                </span>
              ) : paymentMethod === id ? (
                <Check className="size-4 text-primary" />
              ) : null}
            </button>
          ))}
          <div className="flex w-full items-center justify-between rounded-2xl border border-dashed p-3 text-right opacity-60">
            <span className="flex items-center gap-2 font-bold">
              <CreditCard className="size-4" />
              الدفع الإلكتروني (بطاقة)
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold">قريبًا</span>
          </div>
          <p className="rounded-2xl bg-primary-soft/70 p-3 text-xs leading-relaxed text-muted-foreground">
            متاح حاليًا <span className="font-bold text-foreground">الدفع عند الاستلام</span> فقط.
            الدفع عبر بريدي موب والبطاقة قيد التطوير وسيُفعّل بعد اختباره.
          </p>
        </section>
      )}

      {/* الملخص الدائم + زر المتابعة */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3">
        <div className="mx-auto flex max-w-xl items-center gap-3 rounded-3xl border border-border/50 bg-card/95 p-3 shadow-float backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">
              {step < 3 ? "الإجمالي" : "الإجمالي النهائي"}
            </p>
            <p className="text-lg font-bold text-primary">
              {formatDA(total)}
              {step >= 1 && wilayaId && (
                <span className="mr-1 text-[11px] font-medium text-muted-foreground">
                  (توصيل {formatDA(shippingFee)})
                </span>
              )}
            </p>
          </div>
          <button
            disabled={submitting}
            onClick={goNext}
            className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground transition disabled:opacity-45 active:scale-[0.98]"
          >
            {submitting ? "جارٍ الإرسال..." : step === 3 ? "تأكيد الطلب" : "متابعة"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ orderId }: { orderId: string }) {
  const trackCode = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-success/15 text-4xl">
        🎉
      </div>
      <h1 className="text-2xl font-bold">تم تأكيد طلبك!</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        سيتواصل معك التاجر قريبًا لتأكيد التوصيل. احتفظ برمز التتبع هذا:
      </p>
      <div className="w-full max-w-xs rounded-2xl bg-ink py-4 text-ink-foreground">
        <p className="text-[11px] opacity-70">رمز التتبع</p>
        <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">{trackCode}</p>
      </div>
      <div className="grid w-full max-w-xs grid-cols-2 gap-2">
        <Link
          to="/profile"
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          <PackageCheck className="size-4" /> تتبع طلبي
        </Link>
        <Link
          to="/"
          className="flex items-center justify-center rounded-2xl bg-ink py-3 text-sm font-bold text-ink-foreground"
        >
          متابعة التسوق
        </Link>
      </div>
    </div>
  );
}
