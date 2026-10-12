// يُشغَّل بعد `vite build` عند النشر على Vercel.
//
// يجمّع خادم SSR (dist/server/server.js) في ملف CJS واحد مكتفٍ ذاتيًا داخل
// api/_generated/server.cjs — بلا import() ديناميكي ولا مسارات نسبية، كي تعمل
// دالة Vercel Serverless بموثوقية (مُختبَر: / و /explore يعيدان 200).

import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(root, "api", "_generated", "server.cjs");

// نقرأ البيئة كما يقرأها Vite نفسه: ملفات .env + متغيرات العملية (الأخيرة تتقدّم).
// على Vercel تكون المتغيرات في process.env، ومحليًا في .env — فحص واحد للحالتين.
const env = loadEnv(process.env.NODE_ENV || "production", root, "");

// قيم المتصفح: نقبل VITE_ أو متغيرات الخادم، لأن vite.config.ts يشتق إحداها من
// الأخرى وقت البناء. المهم أن تصل قيمة غير فارغة إلى الحزمة.
const clientRequired = [
  { label: "VITE_SUPABASE_URL", sources: ["VITE_SUPABASE_URL", "SUPABASE_URL"] },
  { label: "VITE_SUPABASE_PUBLISHABLE_KEY", sources: ["VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"] },
];
const missingClient = clientRequired.filter((item) => !item.sources.some((key) => env[key]));
if (missingClient.length) {
  console.error(
    `\n[vercel] ❌ متغيرات مطلوبة وقت البناء ناقصة: ${missingClient.map((item) => item.label).join(", ")}\n` +
      `[vercel]    بلاها تصل حزمة المتصفح برابط Supabase فارغ ويرمي createClient\n` +
      `[vercel]    الخطأ "Invalid supabaseUrl" فيظهر خطأ في المتصفح مع أن SSR يعمل.\n` +
      `[vercel]    الحل: Vercel → Settings → Environment Variables → أضف SUPABASE_URL\n` +
      `[vercel]    و SUPABASE_PUBLISHABLE_KEY لكل البيئات ثم أعد النشر (Redeploy).\n` +
      `[vercel]    راجع DEPLOY-VERCEL.md\n`,
  );
  process.exit(1);
}

// متغيرات الخادم تُقرأ وقت التشغيل، فغيابها تحذير لا خطأ بناء.
const serverRequired = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
const missingServer = serverRequired.filter((key) => !env[key]);
if (missingServer.length) {
  console.warn(
    `\n[vercel] ⚠️  متغيرات الخادم ناقصة: ${missingServer.join(", ")}\n` +
      `[vercel]    أضفها في Vercel → Settings → Environment Variables ثم أعد النشر.\n`,
  );
}

mkdirSync(dirname(outfile), { recursive: true });

await build({
  entryPoints: [join(root, "dist", "server", "server.js")],
  outfile,
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  external: ["node:*"],
  conditions: ["import", "module", "default"],
  logLevel: "info",
});

console.log(`[vercel] server bundle -> ${outfile}`);
