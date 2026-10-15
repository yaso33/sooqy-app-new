import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Camera,
  FileText,
  Heart,
  MapPin,
  Search,
  Shield,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/sooqy/page-header";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "حول SooQy — SOOQY" },
      { name: "description", content: "تعرف على SOOQY: منصة التسوق المحلية الجزائرية." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-4 px-4 pt-5">
      <PageHeader title="حول SooQy" subtitle="منصة التسوق المحلية" back="/settings" />

      {/* بطاقة التعريف */}
      <div className="overflow-hidden rounded-3xl bg-primary p-6 text-center text-primary-foreground shadow-lift">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white/15">
          <ShoppingBag className="size-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">SOOQY</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/85">
          سوقك المحلي في جيبك: شاهد السلعة، احجزها، واستلمها من أقرب متجر إليك.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
          <Heart className="size-3.5" />
          الإصدار 1.0.0
        </span>
      </div>

      {/* ما هو SooQy */}
      <section className="space-y-2 rounded-2xl bg-card p-5 shadow-soft">
        <h3 className="font-bold">ما هو SooQy؟</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          SooQy منصة جزائرية تربطك بالمتاجر القريبة منك. تصفّح المنتجات الحقيقية لدى التجار
          المحليين، احجز ما يناسبك أو اطلب توصيله إلى بابك عبر الولايات، وتابع كل طلبك لحظة بلحظة.
        </p>
      </section>

      {/* المميزات */}
      <section className="space-y-2">
        <h3 className="px-1 font-bold">ماذا يمكنك أن تفعل؟</h3>
        <div className="grid grid-cols-1 gap-2">
          <Feature
            icon={<Search className="size-5" />}
            title="تصفّح وبحث ذكي"
            desc="ابحث عن المنتجات والمتاجر القريبة، ورتّب النتائج حسب الولاية والبلدية."
          />
          <Feature
            icon={<Camera className="size-5" />}
            title="شاهد السلعة قبل الخروج"
            desc="صور المنتج الحقيقية لدى التاجر — اعرف الشكل والمقاس واللون قبل أن تطلب."
          />
          <Feature
            icon={<MapPin className="size-5" />}
            title="حجز من المحل"
            desc="احجز المنتج واستلمه من المحل خلال المهلة المحددة، بدون دفع مسبق."
          />
          <Feature
            icon={<Truck className="size-5" />}
            title="توصيل عبر الولايات"
            desc="اطلب التوصيل إلى عنوانك، مع رسوم واضحة تُعرض قبل تأكيد الطلب."
          />
          <Feature
            icon={<Store className="size-5" />}
            title="افتح متجرك"
            desc="التاجر يدير منتجاته ومخزونه وحجوزاته وطلباته من استوديو التاجر."
          />
          <Feature
            icon={<Shield className="size-5" />}
            title="حماية وخصوصية"
            desc="بياناتك محمية، والمراجعات متاحة فقط لمن استلم طلبًا مؤكدًا."
          />
        </div>
      </section>

      {/* روابط */}
      <section className="space-y-2">
        <h3 className="px-1 font-bold">روابط مفيدة</h3>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/help"
            className="flex items-center gap-2 rounded-2xl bg-card p-3 text-sm font-bold shadow-soft"
          >
            <span className="text-primary">
              <Search className="size-5" />
            </span>
            المساعدة والدعم
          </Link>
          <Link
            to="/terms"
            className="flex items-center gap-2 rounded-2xl bg-card p-3 text-sm font-bold shadow-soft"
          >
            <span className="text-primary">
              <FileText className="size-5" />
            </span>
            شروط الاستخدام
          </Link>
          <Link
            to="/privacy"
            className="flex items-center gap-2 rounded-2xl bg-card p-3 text-sm font-bold shadow-soft"
          >
            <span className="text-primary">
              <Shield className="size-5" />
            </span>
            سياسة الخصوصية
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-2xl bg-card p-3 text-sm font-bold shadow-soft"
          >
            <span className="text-primary">
              <ShoppingBag className="size-5" />
            </span>
            حسابي
          </Link>
        </div>
      </section>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        صُنع بحب في الجزائر · © {new Date().getFullYear()} SooQy
      </p>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
