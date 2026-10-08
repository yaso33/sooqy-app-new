# خطة إصلاح الشاشة البيضاء في تطبيق أندرويد (APK)

## السياق
التطبيق يعمل بشكل طبيعي في المتصفح (`npm run dev`)، لكن داخل الـ APK (Capacitor WebView) تظهر شاشة بيضاء فارغة. المشروع مبني بـ **TanStack Start** (أسلوب SSR — الخادم يصدّر HTML كامل + حمولة hydration `__TSR__`)، بينما الـ APK يقدّم **ملفات ثابتة فقط** (`dist/client`). الفرضية الأساسية: `index.html` المولّد يفتقر لحمولة SSR، فيفشل العميل في الرسم بصمت (بدون أخطاء console) → شاشة بيضاء.

## المرحلة 1: تشخيص نهائي (قبل أي تعديل)
- تشغيل `scripts/serve-static.mjs` على `dist/client` (نفس ما يقدّمه WebView) وفحص headless مع **فحص DOM فعلي**: عدد أطفال `#root`، طول نص body، رسائل hydration في console (`errors_only: false`).
- فحص `dist/client/index.html` الحالي: هل يحتوي حمولة `__TSR__` أو `<div id="root">` فارغ؟
- النتيجة تحسم السبب: غياب حمولة SSR أم خطأ JS آخر.

## المرحلة 2: الحل الأساسي — توليد index.html حقيقي عبر SSR (prerender)
- سكربت جديد `scripts/prerender.mjs`:
  1. تشغيل خادم Nitro المبني (`dist/server/server.js`) على منفذ محلي
  2. جلب `/` وحفظ HTML الناتج (يحتوي التطبيق المُصدَّر فعليًا + حمولة hydration `__TSR__`)
  3. إعادة كتابة المسارات المطلقة `/assets/...` إلى نسبية `assets/...` (توافق WebView)
  4. **fallback**: لو فشل SSR (مثلًا Supabase غير متاح في CI) → HTML بديل يحمّل الحزمة (السلوك الحالي) مع تحذير واضح
- ربطه في `scripts/build-mobile.mjs`: `build → prerender → cap sync`
- تحديث `.github/workflows/android.yml`: تمرير متغيرات البيئة من GitHub Secrets (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) ليعمل الـ prerender داخل CI

## المرحلة 3: التحقق وبناء APK
- محليًا: تشغيل البناء + المعاينة الثابتة + فحص DOM (أطفال `#root` > 0، نص body غير فارغ)
- commit + push → الـ workflow يبني APK → تحميل artifact
- **خطة بديلة** إن ثبت أن prerender غير مستقر: إدخال نقطة دخول SPA مستقلة للجوال (TanStack Router client-side فقط بدون Start) — تُبنى بجانب البناء الرئيسي

## المرحلة 4: توثيق
- تحديث `AGENTS.md` بآلية البناء الجديدة (prerender + متغيرات CI المطلوبة)