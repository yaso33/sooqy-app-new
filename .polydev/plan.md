# خطة إعادة تصميم SooQy — Design Specification v1.0 (نسخة معدّلة)

**القواعد المُلزمة (حسب طلبك):**
1. **تغييرات تصميمية فقط** — لا هجرات SQL، لا جداول جديدة، لا تغيير في دوال `src/lib/sooqy.ts` المنطقية أو Supabase.
2. **صفر بيانات تجريبية** — كل شاشة تعرض بيانات حقيقية من قاعدة البيانات عبر الدوال الموجودة. أي شاشة ليس لها مصدر بيانات حقيقي تُعرض بحالة فارغة صادقة (لا عناصر وهمية).
3. **الإضافات الجديدة مسموحة** شرط أن تعرض بيانات حقيقية أو تخزّن اختيارات المستخدم محليًا (مثل المفضلة).

---

## المرحلة 1 — نظام التصميم (`src/styles.css`)
- استبدال لوحة البرتقالي بمنظومة **Indigo/Violet**: Primary `#6366F1` · Dark `#4F46E5` · Light `#E0E7FF` · خلفية `#F8FAFC` · سطح `#FFFFFF` · نصوص `#111827/#64748B/#94A3B8` · حدود `#E2E8F0` + متغيرات Dark Mode جاهزة.
- Typography: Display 32/Bold · H1 24 · H2 20 · H3 18 · Body 16/14 · Caption 12 · Price 20/Bold.
- Radius موحّد 8/12/16/20/Pill، ظلال خفيفة جدًا (البطاقات بـ Background+Border).
- أزرار 48px/Radius 12 بحالاتها، Search Bar 48px/12.

## المرحلة 2 — الهيكل والتنقل
- `BottomNav` (5 عناصر: الرئيسية/الخريطة/اكتشف/السلة/حسابي، نشط Indigo، Badge على السلة).
- `__root.tsx`: خلفية `#F8FAFC` + دمج Splash.
- **Splash** (واجهة فقط): "SooQy" + "Discover. Shop. Local." ثم انتقال تلقائي (localStorage — لا بيانات).
- **Onboarding** (3 شاشات + "ابدأ الآن"): يظهر مرة واحدة (localStorage — لا بيانات).

## المرحلة 3 — الشاشات العشر الأساسية (كلها ببيانات حقيقية)
| الشاشة | الملف | المصدر الحقيقي |
|---|---|---|
| الرئيسية | `index.tsx` + `cards.tsx` | `fetchNearStores` + `searchProducts` |
| الخريطة | `map.tsx` | `fetchNearStores` + الخريطة الحالية |
| اكتشف | `explore.tsx` | `searchProducts` + `searchStores` |
| البحث (وضع داخل explore) | `explore.tsx` | `searchProducts` + `searchStores` |
| المتجر | `stores.$storeId.tsx` | `getStore` + `getStoreOffers` + `fetchReviews` |
| المنتج | `products.$productId.tsx` | `getProduct` + `getProductComparisonOffers` |
| السلة | `bag.tsx` | `useBag` + `getOffersByIds` |
| إتمام الطلب | `checkout.tsx` | `useBag` + `createOrderWithDelivery` |
| الطلبات (جديد) | `orders.tsx` | `fetchMyOrders` — تبويبات حسب حالة حقيقية |
| حسابي | `account.tsx` | `useAuth` + `fetchMyOrders` + `fetchMyReservations` |

## المرحلة 4 — الإضافات الجديدة (بدون بيانات وهمية)
- **المفضلة** (جديد `favorites.tsx`): تبويبان منتجات/متاجر — تحفظ **المعرفات فقط** في localStorage، وتعرض **البيانات الحقيقية** من قاعدة البيانات عبر الدوال الموجودة.
- **تتبع الطلب** (جديد): Timeline مبني على **حالة الطلب الحقيقية** من `fetchMyOrders`.
- **صفحة التصنيف** (جديد): فئات فرعية + Sort/Filter + شبكة — كلها من `searchProducts` الحقيقية.
- **الإشعارات** (جديد `notifications.tsx`): **حالة فارغة صادقة فقط** ("لا توجد إشعارات بعد") لأن لا يوجد جدول إشعارات في قاعدة البيانات — بدون عناصر وهمية.
- **التاجر** (`studio.tsx`): إعادة تصميم Onboarding + Dashboard + إضافة منتج — بنفس الدوال الموجودة `merchantCreateStore`/`fetchMyStore`/إلخ.

## المرحلة 5 — حالات الواجهة
- Skeleton Loading لكل الشاشات الرئيسية · Empty States موحّدة · Error States + "إعادة المحاولة" · حالات الأزرار والمدخلات.

## المرحلة 6 — الفحص النهائي
- `check_preview` لكل الشاشات (لا أخطاء JS/شاشات فارغة) · `CI=1 npm test` · `npm run build` · تحديث `AGENTS.md`.

---
**تأكيد:** لا جدول جديد، لا هجرة SQL، لا بيانات تجريبية — كل ما يُعرض يأتي من قاعدة البيانات الحية، والمفضلة تحفظ اختيارات المستخدم محليًا فقط.