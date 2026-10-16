import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { registerDeliveryCompany } from "@/lib/delivery";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/delivery-register")({
  head: () => ({
    meta: [
      { title: "تسجيل شركة توصيل — SOOQY" },
      {
        name: "description",
        content:
          "سجّل شركة التوصيل الخاصة بك في SOOQY لاستقبال طلبات الشحن من المتاجر وإدارة التوصيلات.",
      },
    ],
  }),
  component: DeliveryRegisterPage,
});

function DeliveryRegisterPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  if (!ready) return null;

  if (!user) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <Truck className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold">تحتاج لدخول الحساب</h1>
        <p className="text-sm text-muted-foreground">
          لتسجيل شركة توصيل، يجب أن تكون مسجلاً الدخول أولاً.
        </p>
        <Link
          to="/auth"
          search={{ redirect: "/delivery-register" }}
          className="inline-block rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground"
        >
          دخول
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyName.trim() || !contactPhone.trim()) {
      toast.error("يرجى ملء اسم الشركة ورقم الهاتف على الأقل.");
      return;
    }
    setBusy(true);
    try {
      await registerDeliveryCompany({
        user_id: user.id,
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim(),
        email: email.trim() || null,
        license_number: licenseNumber.trim() || null,
      });
      toast.success(
        "تم إرسال طلب تسجيل الشركة. سيتم مراجعته واعتماده من قبل المنصة قبل تفعيل الحساب.",
      );
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الشركة. أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 px-4 pb-32 pt-5">
      <PageHeader title="تسجيل شركة توصيل" subtitle="انضم إلى شبكة التوصيل في SOOQY" back="/" />

      <section className="rounded-3xl bg-card p-5 shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-primary" />
          <h2 className="font-bold">بيانات الشركة</h2>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="اسم الشركة التجاري"
            className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="اسم الشخص المسؤول (اختياري)"
            className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <input
            required
            type="tel"
            inputMode="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="رقم هاتف الشركة (مطلوب)"
            className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني (اختياري)"
            className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="رقم السجل التجاري / الرخصة (اختياري)"
            className="h-12 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-indigo-500"
          />

          <p className="text-xs text-muted-foreground leading-relaxed">
            بعد التسجيل، ستظهر شركتك في قائمة الشركات المتاحة للمتاجر، ولكن لن يتم قبول طلبات الشحن
            حتى يتم اعتماد حسابك من قبل إدارة المنصة.
          </p>

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "w-full rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground transition disabled:opacity-50",
              busy && "cursor-not-allowed",
            )}
          >
            {busy ? "جارٍ الإرسال..." : "إرسال طلب التسجيل"}
          </button>
        </form>
      </section>

      <div className="text-center text-xs text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <Link to="/" className="text-primary font-bold hover:underline">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
