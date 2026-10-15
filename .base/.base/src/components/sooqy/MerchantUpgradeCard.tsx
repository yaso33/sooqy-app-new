import { useState } from "react";
import { ArrowLeft, Sparkles, Store } from "lucide-react";

export function MerchantUpgradeCard({
  isMerchant,
  onBecomeMerchant,
}: {
  isMerchant: boolean;
  onBecomeMerchant: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (isMerchant) {
    return (
      <section className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">حساب التاجر</p>
            <h2 className="font-bold">تم تفعيل حسابك بالفعل</h2>
          </div>
          <Store className="size-6 text-primary" />
        </div>
      </section>
    );
  }

  const becomeMerchant = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onBecomeMerchant();
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="rounded-3xl border border-success/30 bg-success/10 p-4 text-right">
        <div className="flex items-center gap-2 text-success">
          <Sparkles className="size-5" />
          <h2 className="font-bold">تم تفعيل حساب التاجر بنجاح.</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          يمكنك الآن فتح متجرك وإدارة المنتجات والحجوزات والطلبات.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">هل لديك متجر؟</p>
          <h2 className="mt-1 font-bold">احصل على حساب تاجر</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            أضف منتجاتك، أدر المخزون، وأنشئ حجوزاتك وطلباتك.
          </p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <Store className="size-6" />
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={becomeMerchant}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "جارٍ تحويل الحساب..." : "أصبح تاجرًا"}
        {!busy && <ArrowLeft className="size-4" />}
      </button>
    </section>
  );
}
