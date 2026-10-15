// خادم تسليم الـ APK للمستخدم: صفحة بسيطة بزر تحميل مباشر.
// السبب: مستكشف ملفات التطبيق لا يوفّر زر تنزيل، وروابط GitHub Actions تحتاج نسخًا وتحمّلًا.
// التشغيل: node scripts/serve-download.mjs  →  http://127.0.0.1:4174
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const APK_NAME = "SooQy-v1.0.0.apk";

// نبحث عن الـ APK في جذر المشروع أولًا، ثم في مخرجات Gradle.
function findApk() {
  const candidates = [
    path.join(root, APK_NAME),
    path.join(root, "android/app/build/outputs/apk/release/app-release.apk"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function humanSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function page(apkPath) {
  const exists = apkPath !== null;
  const size = exists ? humanSize(fs.statSync(apkPath).size) : "—";
  const date = exists ? new Date(fs.statSync(apkPath).mtime).toISOString().slice(0, 16).replace("T", " ") : "—";
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>تنزيل تطبيق SooQy</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
         background: #F8FAFC; color: #111827; padding: 24px; }
  .card { width: 100%; max-width: 420px; background: #fff; border: 1px solid #E2E8F0;
          border-radius: 20px; padding: 28px 24px; box-shadow: 0 8px 24px rgba(15,23,42,.08); text-align: center; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  p  { margin: 0 0 20px; color: #64748B; font-size: 14px; }
  a.btn { display: block; background: #6366F1; color: #fff; text-decoration: none;
          padding: 16px; border-radius: 14px; font-size: 18px; font-weight: 700; }
  a.btn:active { background: #4F46E5; }
  .meta { margin-top: 18px; font-size: 13px; color: #94A3B8; }
  .warn { margin-top: 14px; font-size: 13px; color: #B45309; background: #FFFBEB;
          border: 1px solid #FDE68A; border-radius: 12px; padding: 10px; }
  ul { text-align: right; font-size: 14px; color: #475569; margin: 18px 0 0; padding-inline-start: 20px; }
  li { margin-bottom: 6px; }
</style>
</head>
<body>
  <div class="card">
    <h1>تنزيل تطبيق SooQy</h1>
    <p>النسخة 1.0.0 — تحتوي إصلاح تجمّد لوحة المفاتيح</p>
    ${exists
      ? `<a class="btn" href="/download" download="${APK_NAME}">⬇︎ تنزيل التطبيق (${size})</a>`
      : `<div class="warn">لم يُعثر على ملف APK — نفّذ البناء أولًا.</div>`}
    <div class="meta">${exists ? `الحجم: ${size} · آخر بناء: ${date}` : ""}</div>
    <ul>
      <li>اضغط الزر أعلاه لتنزيل الملف.</li>
      <li>عند اكتمال التنزيل، افتح الملف لتثبيته.</li>
      <li>إن ظهرت رسالة «تثبيت من مصادر غير معروفة»، اسمح بها للمتصفح.</li>
    </ul>
  </div>
</body>
</html>`;
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const apkPath = findApk();

    if (urlPath === "/download") {
      if (!apkPath) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("APK غير موجود");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Length": fs.statSync(apkPath).size,
        "Content-Disposition": `attachment; filename="${APK_NAME}"`,
      });
      fs.createReadStream(apkPath).pipe(res);
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page(apkPath));
  })
  .listen(4174, "127.0.0.1", () => console.log("download server on 4174"));
