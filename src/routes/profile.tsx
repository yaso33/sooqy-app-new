import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, Save, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  fetchMyProfile,
  fetchSchemaSupport,
  isValidDzPhone,
  normalizePhone,
  updateMyProfile,
  uploadImageToBucket,
} from "@/lib/sooqy";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي — SooQy" },
      { name: "description", content: "عدّل اسمك ورقم هاتفك ووليتك في SooQy." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile, enabled: !!user });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // تعبئة النموذج من بيانات الحساب والملف — مرة واحدة
  useEffect(() => {
    if (loaded || !user) return;
    setFullName((user.user_metadata?.["full_name"] as string | undefined) ?? "");
    if (profile.data) {
      setPhone(profile.data.phone ?? "");
      setWilayaId(profile.data.wilaya_id);
      setCommune(profile.data.commune ?? "");
      setAvatarPreview(profile.data.avatar_url ?? null);
    }
    setLoaded(true);
  }, [user, profile.data, loaded]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-primary-soft">
          <User className="size-9 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="text-h1 text-foreground">سجّل الدخول لتخصيص ملفك</h1>
        <p className="max-w-xs text-body text-muted-foreground">
          اسمك ورقم هاتفك وولايتك — كلها في مكان واحد.
        </p>
        <Link to="/auth" className="btn-primary mt-2">
          دخول
        </Link>
      </div>
    );

  const initial = (user.email ?? "؟").slice(0, 1).toUpperCase();

  const save = async () => {
    const name = fullName.trim();
    if (!name) {
      toast.error("اكتب اسمك الكامل.");
      return;
    }
    const p = normalizePhone(phone.trim());
    if (p && !isValidDzPhone(p)) {
      toast.error("رقم الهاتف غير صالح — يجب أن يبدأ بـ 05 أو 06 أو 07.");
      return;
    }
    setBusy(true);
    try {
      let avatarUrl: string | null | undefined = undefined;
      let avatarSkipped = false;
      if (avatar) {
        avatarUrl = await uploadImageToBucket(avatar, "store-media");
        // القاعدة غير مهاجَرة (عمود avatar_url مفقود) — لا تخزين صامت بلا نتيجة
        const support = await fetchSchemaSupport();
        avatarSkipped = !support.avatar;
      }
      await updateMyProfile({
        full_name: name,
        phone: p,
        wilaya_id: wilayaId,
        commune: commune.trim(),
        ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      });
      // مزامنة الاسم مع auth metadata ليظهر في حسابي فورًا
      await supabase.auth.updateUser({ data: { full_name: name } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      if (avatarSkipped) {
        toast.warning("حُفظت بياناتك، لكن الصورة الشخصية تحتاج تحديث قاعدة البيانات.");
      } else {
        toast.success("تم حفظ الملف الشخصي ✅");
      }
      navigate({ to: "/account" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-6">
      <PageHeader
        title="الملف الشخصي"
        subtitle="بياناتك تظهر للتجار عند الطلب والحجز"
        back="/account"
      />

      {/* بطاقة المعاينة */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground">
          {avatarPreview ? (
            <img src={avatarPreview} alt="صورتك الشخصية" className="size-full object-cover" />
          ) : fullName.trim() ? (
            fullName.trim()[0]
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-1 text-h3 text-foreground">
            {fullName.trim() || "اسمك الكامل"}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          {profile.data?.is_phone_verified && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
              <BadgeCheck className="size-3" /> هاتف موثّق
            </span>
          )}
        </div>
      </div>

      {/* النموذج */}
      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 text-start"
        >
          <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
            {avatarPreview ? (
              <img src={avatarPreview} alt="معاينة الصورة" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-lg font-bold text-primary">
                {fullName.trim() ? fullName.trim()[0] : initial}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
              <Camera className="size-5" />
            </span>
          </span>
          <span className="text-sm font-bold text-primary">تغيير الصورة الشخصية</span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setAvatar(f);
            setAvatarPreview(f ? URL.createObjectURL(f) : (profile.data?.avatar_url ?? null));
          }}
          className="hidden"
        />

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">الاسم الكامل *</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثال: أحمد بن يوسف"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">رقم الهاتف</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XX XX XX XX"
            inputMode="tel"
            dir="ltr"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-right outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">الولاية</span>
          <WilayaSelect
            value={wilayaId}
            onChange={setWilayaId}
            allLabel="اختر الولاية"
            className="h-11 w-full"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">البلدية</span>
          <input
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            placeholder="مثال: باب الزوار"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring"
          />
        </label>

        <button
          onClick={save}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
        >
          <Save className="size-4" />
          {busy ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>

      <p className="px-2 text-center text-[11px] text-muted-foreground">
        تُستخدم هذه البيانات لتأكيد الطلبات والتوصيل. يمكنك تعديلها في أي وقت.
      </p>
    </div>
  );
}
