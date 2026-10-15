# 🚀 النشر على Vercel (مجانًا)

المشروع مبني على **TanStack Start** (Vite + React) مع **SSR**، ويعتمد على Supabase في قاعدة البيانات والمصادقة. الإعداد أدناه جاهز ومختبَر محليًا (الصفحات `/` و`/explore` والملفات الثابتة كلها تعيد 200).

---

## 1) جهّز المستودع

```bash
git add .
git commit -m "chore: Vercel deployment setup"
git push
```

> `dist/` و`api/_generated/` مستثناة من Git (كما يجب) — Vercel يبنيهما أثناء النشر.

---

## 2) اربط المشروع بـ Vercel

1. افتح [vercel.com/new](https://vercel.com/new) وسجّل الدخول بحساب GitHub.
2. **Import Git Repository** → اختر مستودع SooQy.
3. لا تغيّر شيئًا في الإعدادات: `vercel.json` يضبط كل شيء تلقائيًا:
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `dist/client`
   - **Framework Preset**: Other (اتركه كما هو)

---

## 3) متغيرات البيئة (خطوة إلزامية)

قبل الضغط على Deploy، افتح **Environment Variables** وأضف القيم التالية (انسخها من ملف `.env` المحلي)، وفعّلها على Environments الثلاثة (Production / Preview / Development):

| المتغير | ملاحظة |
|---|---|
| `SUPABASE_URL` | **مطلوب** — يُدمج في الواجهة والخادم وقت البناء (يشتق منه `VITE_SUPABASE_URL` تلقائيًا) |
| `SUPABASE_PUBLISHABLE_KEY` | **مطلوب** — يُدمج في الواجهة والخادم (يشتق منه `VITE_SUPABASE_PUBLISHABLE_KEY` تلقائيًا) |
| `SUPABASE_SERVICE_ROLE_KEY` | **سرّي** — دوال الخادم فقط (تجاوز RLS) |
| `VITE_SUPABASE_URL` | اختياري الآن — يتقدّم على الاشتقاق إن وُجد |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | اختياري الآن — يتقدّم على الاشتقاق إن وُجد |
| `SUPABASE_ANON_KEY` | اختياري (توافق) |
| `SUPABASE_PROJECT_ID` | اختياري |
| `VITE_GOOGLE_MAPS_API_KEY` | اختياري (الخريطة) |
| `SOOQY_CRON_SECRET` | اختياري (مهام cron) |

⚠️ لا تضف `DATABASE_URL` على Vercel إلا إذا كنت تستخدمه من دوال الخادم فقط (تطبيق الهجرات يتم محليًا).

> **مهم جدًا**: قيم Supabase تُدمج **وقت البناء** داخل حزمة المتصفح. إن نُشر الموقع بلا `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` تصل الحزمة بقيمة `undefined`، فيرمي `createClient(undefined)` الخطأ `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` وينهار التطبيق في المتصفح (تبدو الصفحة كصفحة خطأ — مع أن SSR يعمل). لذلك **يفشل البناء الآن بوضوح** إن كانتا ناقصتين، بدل نشر موقع مكسور. أضِفهما قبل أول Deploy، وإن أضفتهما لاحقًا فأعد النشر (Redeploy).

---

## 4) انشر

اضغط **Deploy** ثم انتظر ~2-3 دقائق. النتيجة:

- رابط مجاني: `https://<project>.vercel.app`
- HTTPS تلقائي + نطاق مخصص مجاني (Settings → Domains).
- كل `git push` على `main` يعيد النشر تلقائيًا (وكل PR يحصل على Preview URL).

---

## 5) إعداد Supabase بعد النشر

في **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://<project>.vercel.app`
- **Redirect URLs**: أضف `https://<project>.vercel.app/auth/callback`

بدون هذه الخطوة سيفشل تسجيل الدخول بـ Google (يعيد التوجيه إلى localhost).

---

## كيف يعمل النشر تقنيًا (للمرجع)

المشروع ليس موقعًا ثابتًا: صفحاته تُصيَّر على الخادم (SSR) عبر معالج `fetch(request, env, ctx)`.

- **`scripts/bundle-server-for-vercel.mjs`** (بعد `vite build`): يجمّع `dist/server/server.js` في ملف **CJS واحد مكتفٍ ذاتيًا** في `api/_generated/server.cjs` (esbuild، `platform=node`، `external: node:*`). هذا يلغي كل `import()` الديناميكي الذي يفشل في بيئة Serverless ويجعل الدالة موثوقة.
- **`api/index.ts`**: دالة Vercel (Node). تخدم أي ملف ثابت من `dist/client` (شبكة أمان)، وإلا تمرّر الطلب إلى معالج SSR وترجع ردّه كما هو.
- **`vercel.json`**: أمر البناء، مجلد الإخراج، وإعداد الدالة، وrewrite يوجّه المسارات غير الثابتة إلى `/api`.

> **ملاحظة مهمة**: على Vercel يُفحص نظام الملفات **قبل** تطبيق الـrewrites، لذا تُخدَم ملفات `dist/client` مباشرة من CDN (سريعة وبلا استدعاء دالة)، ولا تصل إلى الدالة إلا المسارات الديناميكية (SSR).

### اختبار محلي (اختياري)

```bash
npm run build:vercel
node -e "process.env.SUPABASE_URL='https://x.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='k';console.log(typeof require('./api/_generated/server.cjs'))"
```

### استكشاف الأخطاء

| العَرَض | السبب المحتمل |
|---|---|
| `500` على كل الصفحات | متغير `SUPABASE_URL` أو `SUPABASE_PUBLISHABLE_KEY` غير مضبوط على Vercel |
| صفحة خطأ/انهيار في المتصفح | `SUPABASE_URL` لم تكن موجودة **وقت البناء** (تُدمج في حزمة المتصفح) → أضفها وأعد النشر. رسالة الخطأ الحية: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` |
| الصفحة تعمل والأصول 404 | `outputDirectory` ليس `dist/client` |
| فشل تسجيل دخول Google | لم تُضف Redirect URL في Supabase |
| خطأ `Cannot find module` في الدالة | `api/_generated/server.cjs` لم يُبنَ — تأكد أن أمر البناء `npm run build:vercel` |

### تشخيص سريع من المتصفح

صفحة الخطأ تحتوي قسمًا **«تفاصيل تقنية (للدعم)»** يعرض رسالة الخطأ (منظَّفة من أي أسرار) و**حضور** متغيرات البيئة (`SUPABASE_URL=✓/✗`) — بلا كشف أي قيمة. افتحه وانظر أي متغير ناقص (✗)، وسُجّل الخطأ الكامل مع الـstack في تبويب **Vercel → Logs → Functions**.
