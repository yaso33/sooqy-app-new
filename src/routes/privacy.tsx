import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/sooqy/page-header";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — SOOQY" },
      { name: "description", content: "سياسة الخصوصية لمنصة SOOQY للتسوق المحلي." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="space-y-4 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link to="/" aria-label="رجوع" className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft">
        <ArrowRight className="size-5" />
      </Link>
      <PageHeader title="سياسة الخصوصية" subtitle="آخر تحديث: 2026" />
      <div className="space-y-4 rounded-2xl bg-card p-5 text-sm leading-relaxed text-foreground shadow-soft">
        <section className="space-y-1">
          <h2 className="font-bold">1. المعلومات التي نجمعها</h2>
          <p className="text-muted-foreground">
            نسجّل عند التسجيل: الاسم، رقم الهاتف، الولاية والبلدية، وعنوان التوصيل. عند فتح متجر: اسم المتجر،
            بيانات التواصل، وصفه، وصور الشعار والغلاف. قد ترفع صورة شخصية لملفك.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">2. كيف نستخدم معلوماتك</h2>
          <p className="text-muted-foreground">
            لتقديم الخدمة فقط: إيصال الطلبات بين الزبون والمتجر، حساب رسوم التوصيل، إشعارات حالة الطلب والحجز،
            وتحسين تجربة الاستخدام. لا نبيع بياناتك لأي طرف ثالث ولا نستخدمها للإعلانات الخارجية.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">3. تخزين البيانات وحمايتها</h2>
          <p className="text-muted-foreground">
            تُخزَّن بياناتك على خوادم Supabase (منطقة الاتحاد الأوروبي) مع تشفير أثناء النقل، وتقييد صلاحيات
            الوصول حسب الدور (زبون/تاجر/مشرف)، وقواعد أمان على مستوى الصفوف.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">4. الملفات والصور</h2>
          <p className="text-muted-foreground">
            صور المنتجات والشعارات والغلاف والوصلات تُخزَّن في سلات خاصة لا يمكن الوصول إليها إلا عبر روابط
            موقّعة، ولا يظهر منها للعموم إلا ما يعرضه المتجر في صفحته.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">5. حقوقك</h2>
          <p className="text-muted-foreground">
            يمكنك تعديل بياناتك من صفحة الملف الشخصي، وتصحيح معلومات متجرك من صفحة تخصيص المتجر. لطلب حذف
            حسابك وبياناتك كاملة، تواصل معنا عبر البريد الإلكتروني في صفحة المساعدة.
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-bold">6. تغييرات على هذه السياسة</h2>
          <p className="text-muted-foreground">
            نحدّث هذه الصفحة عند أي تغيير جوهري في طريقة معالجة البيانات، ويُعتبر استمرارك في استخدام المنصة
            موافقة على النسخة المحدّثة.
          </p>
        </section>
      </div>
    </div>
  );
}