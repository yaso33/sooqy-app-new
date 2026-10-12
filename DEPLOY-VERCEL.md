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
| `VITE_SUPABASE_URL` | يُدمج وقت البناء — مطلوب للواجهة |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | يُدمج وقت البناء — مطلوب للواجهة |
| `SUPABASE_URL` | مطلوب لخادم SSR |
| `SUPABASE_PUBLISHABLE_KEY` | مطلوب لخادم SSR |
| `SUPABASE_SERVICE_ROLE_KEY` | **سرّي** — دوال الخادم فقط (تجاوز RLS) |
| `SUPABASE_ANON_KEY` | اختياري (توافق) |
| `SUPABASE_PROJECT_ID` | اختياري |
| `VITE_GOOGLE_MAPS_API_KEY` | اختياري (الخريطة) |
| `SOOQY_CRON_SECRET` | اختياري (مهام cron) |

⚠️ لا تضف `DATABASE_URL` على Vercel إلا إذا كنت تستخدمه من دوال الخادم فقط (تطبيق الهجرات يتم محليًا).

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
- **`api/index.ts`**: دالة Vercel (Node). تخدم أولًا أي ملف ثابت من `dist/client` (شبكة أمان)، وإلا تمرّر الطلب إلى معالج SSR وترجع ردّه كما هو.
- **`vercel.json`**: أمر البناء، مجلد الإخراج، تضمين `dist/client` داخل الدالة (`includeFiles`)، وrewrite يوجّه المسارات غير الثابتة إلى `/api`.

### اختبار محلي (اختياري)

```bash
npm run build:vercel
node -e "process.env.SUPABASE_URL='https://x.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='k';console.log(typeof require('./api/_generated/server.cjs'))"
```

### استكشاف الأخطاء

| العَرَض | السبب المحتمل |
|---|---|
| `500` على كل الصفحات | متغير `SUPABASE_URL` أو `SUPABASE_PUBLISHABLE_KEY` غير مضبوط على Vercel |
| الصفحة تعمل والأصول 404 | `outputDirectory` ليس `dist/client` |
| فشل تسجيل دخول Google | لم تُضف Redirect URL في Supabase |
| خطأ `Cannot find module` في الدالة | `api/_generated/server.cjs` لم يُبنَ — تأكد أن أمر البناء `npm run build:vercel` |
