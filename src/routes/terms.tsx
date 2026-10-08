import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/sooqy/page-header";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — SOOQY" },
      { name: "description", content: "شروط استخدام منصة SOOQY للتسوق المحلي." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="space-y-4 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link to="/" aria-label="رجوع" className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft">
        <ArrowRight className="size-5" />
      </Link>
      <PageHeader title="شروط الاستخدام" subtitle="آخر تحديث: 2026" />
      <div className="space-y-4 rounded-2xl bg-card p-5 text-sm leading-relaxed text-foreground shadow-soft">
        <section className="space-y-1">
          <h2 className="font-bold">1. الخدمة</h2>
          <p className="text-muted-foreground">
            SOOQY منصة جزائرية تربطك بالمتاجر القريبة منك لعرض المنتجات، الحجز، والتوصيل عبر الولايات.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">2. الحسابات</h2>
          <p className="text-muted-foreground">
            أنت مسؤول عن الحفاظ على سرية بيانات دخولك، وعن صحة المعلومات التي تقدمها عند التسجيل أو فتح متجر.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">3. الحجز والدفع</h2>
          <p className="text-muted-foreground">
            الحجز يثبت المنتج لك لمدة محدودة. الدفع عند الاستلام أو عبر BaridiMob وفق ما يعرضه المتجر. الأسعار قابلة للتغيير من المتجر.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">4. التوصيل</h2>
          <p className="text-muted-foreground">
            رسوم التوصيل تظهر قبل تأكيد الطلب حسب الولاية. مدة التوصيل تقديرية وقد تتأثر بالظروف.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">5. التجار</h2>
          <p className="text-muted-foreground">
            التاجر مسؤول عن دقة الأسعار، توفر المخزون، وجودة المنتجات، والالتزام بالتأكيد والتسليم في المواعيد المعلنة.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">6. إلغاء الخدمة</h2>
          <p className="text-muted-foreground">
            يحق لنا تعليق أو إلغاء أي حساب يخالف هذه الشروط أو يساء استخدام المنصة، مع إشعار المستخدم.
          </p>
        </section>
      </div>
    </div>
  );
}