-- روابط التواصل الاجتماعي للمتجر + صورة الملف الشخصي
-- (تخصيص إضافي: instagram/facebook للمتجر، avatar للمستخدم)

alter table public.stores
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

alter table public.profiles
  add column if not exists avatar_url text;