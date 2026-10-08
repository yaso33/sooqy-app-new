## اللغة

- كل نصوص واجهة المستخدم بالعربية الفصحى (لا لهجة). حافظ على ذلك في أي نصوص جديدة.
- Run: `npm run dev` (port 8080) · Build: `npm run build` · Test: `CI=1 npm test`

## تصميم ومكونات

- الخط: Tajawal عبر `@fontsource/tajawal` (مضمّن محليًا — لا Google Fonts). يُستورد في `src/routes/__root.tsx`.
- نظام التصميم في `src/styles.css`: منظومة **Indigo** (Primary `#6366F1`/Dark `#4F46E5`/Soft `#E0E7FF`، خلفية `#F8FAFC`، سطح `#FFFFFF`، نصوص `#111827/#64748B/#94A3B8`، حدود `#E2E8F0` + متغيرات `.dark` جاهزة)، ظلال خفيفة عبر utilities `shadow-soft/lift/pop/float`، حركات `animate-fade-up/pop/shake/scale-in`، واحترام `prefers-reduced-motion`. التوكنز تُستخدم عبر `var(--primary)` إلخ — أي لون برتقالي متبقٍ هو خطأ.
- مكونات SOOQY الموحّدة في `src/components/sooqy/`: `ProductCard`/`StoreCard` (cards.tsx)، `FavoriteButton` (قلب، يحفظ **المعرفات فقط** في localStorage)، `EmptyState`، `ErrorState` (خطأ + إعادة المحاولة)، `Skeleton`، `RatingStars`، `QtyStepper`، `Carousel` (embla)، `Reveal` (ظهور متدرج)، `PageHeader`، `PullToRefresh`، `Splash` (شاشة ترحيب قصيرة)، `OnboardingGate` (3 شرائح، مرة واحدة عبر `localStorage["sooqy:onboarded"]`).
- المفضلة: `src/lib/favorites.ts` (useSyncExternalStore + localStorage `sooqy:favorites`) — تخزّن معرفات فقط، والبيانات المعروضة تُجلب حقيقية. رسوم التوصيل: `src/lib/shipping.ts` (`getShippingFee(wilayaId, deliveryType)`) — مشتركة بين السلة والدفع.
- مسارات جديدة: `/orders` (تبويبات حسب الحالة)، `/orders/$orderId` (تتبع)، `/favorites`، `/category/$catId`، `/notifications` (حقيقية من جدول `notifications` + triggers تولّد إشعارات عند تغيّر حالة الطلب/الحجز).
- كل الحركات عبر transform/opacity فقط (قاعدة أداء 60fps).

## اختبارات وتحليلات

- صائد أخطاء الشاشة: `src/lib/screen-error.ts` (يُستورد في `__root.tsx`) — يعرض أي خطأ كطبقة فوق الواجهة حتى داخل WebView في APK: أخطاء JS، فشل تحميل ملفات JS/CSS، وعود مرفوضة، **كشف الشاشة البيضاء بعد 3.5 ثانية**، وحفظ آخر خطأ في `localStorage["sooqy:screen-error"]` ليُعرض عند التشغيل التالي. تقرير يدويًا: `reportScreenError(err, "سياق")` أو من console: `__sooqyReportError(new Error("..."))` — أزرار: إعادة المحاولة / نسخ التفاصيل / إغلاق.
- اختبارات الوحدة: `src/lib/*.test.ts` (vitest). لتشغيلها أوقف dev server أولًا (الصدفة مشتركة): `stop_dev_server` ثم `CI=1 npx vitest run src/lib/geo.test.ts src/lib/sooqy.test.ts`.
- تحليلات محلية بدون خدمات خارجية: `src/lib/analytics.ts` (`track(event, data)`) تخزّن الأحداث في `localStorage["sooqy:events"]` (آخر 200). أحداث: view_product / add_to_bag / begin_checkout / place_order / search.
- التخزين المؤقت: QueryClient في `src/router.tsx` (staleTime 60s، gcTime 10m، preload intent).

## البنية (بعد إزالة Lovable)

- إعداد Vite مستقل في `vite.config.ts`: `tanstackStart({ server: { entry: "server" } })` من `@tanstack/react-start/plugin/vite` + react + tailwind + tsconfig-paths.
- لا توجد أي حزمة `@lovable.dev/*` — الدخول عبر Google يتم بـ `supabase.auth.signInWithOAuth({ provider: "google" })` مباشرة.
- متغيرات البيئة: `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (server) / `DATABASE_URL` / `SOOQY_CRON_SECRET` (cron، كان LOVABLE_CRON_SECRET سابقًا).

## قاعدة البيانات (مطبّقة على المشروع الحي)

- الهجرات تُطبَّق بـ `node scripts/apply-migrations.mjs` (تقرأ `DATABASE_URL` من `.env`، تشغّل كل ملفات `supabase/migrations/*.sql` ثم `supabase/seed.sql` إن كانت الجداول فارغة). الهجرات الثلاث + البيانات التجريبية مطبّقة وموجودة الآن.
- الاتصال عبر **pooler eu-west-1**: `aws-0-eu-west-1.pooler.supabase.com:6543` — المضيف المباشر `db.<ref>.supabase.co` يعطي IPv6 فقط ولا يصل إليه هذا البيئة (يجب IPv4؛ السكربت يضبط `setDefaultResultOrder("ipv4first")`).
- السلات الثلاث (`store-media`, `product-media`, `receipts`) **خاصة** — الكود يعرض الصور عبر روابط موقعة `createSignedUrl`، لا تجعلها عامة.
- فتح المتجر **اختياري** وتوثيقه **تلقائي**: أي مستخدم مسجّل يستدعي `become_merchant` (فوري وidempotent) ثم ينشئ متجرًا بـ `is_verified = true` — لا موافقة إدارية (هجرة `202610100001_auto_verified_stores.sql`).

## تطبيق الجوال (Capacitor)

- **البناء**: `npm run mobile` (= `node scripts/build-mobile.mjs`): `vite build --config vite.mobile.config.ts` → `dist-mobile` (SPA خالص بدون SSR) ثم `npx cap sync android`. الـ APK يُبنى في CI عبر `.github/workflows/android.yml` (كل push لـ main).
- **لماذا SPA وليس SSR**: TanStack Start client لا يرسم بدون حمولة `__TSR__` من الخادم — الملفات الثابتة في WebView تترك `#root` فارغًا (شاشة بيضاء). الحل: نقطة دخول منفصلة `src/entry-mobile.tsx` تستخدم `RouterProvider` مباشرة (SPA خالص) مع `vite.mobile.config.ts` (base: './') — لا يمس بناء الويب الرئيسي `vite.config.ts`.
- **HTML الناتج**: Vite يحافظ على مسار المدخل → `dist-mobile/src/entry-mobile.html`؛ `build-mobile.mjs` ينقله إلى `dist-mobile/index.html` مع تحويل `../assets/` → `assets/`. `capacitor.config.ts` webDir: `dist-mobile`.
- **معاينة محلية**: `node scripts/serve-static.mjs` (منفذ 4173، يخدم `dist-mobile`) أو `npx vite preview --config vite.mobile.config.ts`. فحص ذاتي: `node scripts/check-mobile.mjs` (يجلب الصفحة والأصول ويتحقق من 200).
- **مهم**: لا تعدّل `dist-mobile/` يدويًا (متجاهل في git) — عدّل المصدر (`src/entry-mobile.tsx` / `vite.mobile.config.ts`) وأعد `npm run mobile`.