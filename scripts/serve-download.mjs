// خادم تنزيل الـAPK: صفحة تحميل + تقديم الملف مع Content-Disposition
// يعرض أيضًا رابط النفق العام (localhost.run) إن وُجد في /tmp/server.log
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apkPath = path.join(root, "SooQy-v1.0.0.apk");
const APK_NAME = "SooQy-v1.0.0.apk";
const SIZE_MB = fs.existsSync(apkPath) ? (fs.statSync(apkPath).size / 1024 / 1024).toFixed(1) : "0";

function getTunnelUrl() {
  try {
    const log = fs.readFileSync("/tmp/server.log", "utf8");
    const m = log.match(/https:\/\/[a-z0-9-]+\.lhr\.life/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

function renderPage() {
  const tunnel = getTunnelUrl();
  const tunnelSection = tunnel
    ? `<div class="tunnel">
        <div class="tunnel-title">📱 افتح الرابط في متصفح هاتفك (كروم)</div>
        <p>المعاينة هنا لا تدعم التنزيل — انسخ الرابط التالي وافتحه في متصفح هاتفك:</p>
        <a class="tunnel-link" href="${tunnel}" target="_blank" rel="noopener">${tunnel}</a>
        <div class="hint">اضغط مطوّلًا على الرابط ثم «نسخ»، وافتحه في كروم — سينزّل التطبيق مباشرة.</div>
      </div>`
    : `<div class="tunnel"><div class="tunnel-title">⏳ جارٍ تجهيز رابط التنزيل العام…</div>
        <p>أعد تحميل الصفحة بعد ثوانٍ قليلة.</p></div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>تحميل تطبيق SooQy</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, "Segoe UI", Tahoma, sans-serif; background: #F8FAFC; color: #111827; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 20px; padding: 40px 32px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 12px 32px rgba(15, 23, 42, .08); }
  .logo { width: 72px; height: 72px; border-radius: 18px; background: #6366F1; color: #fff; font-size: 34px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  p { color: #64748B; font-size: 14px; line-height: 1.7; margin-bottom: 6px; }
  .meta { color: #94A3B8; font-size: 12px; margin-bottom: 24px; }
  a.btn { display: block; background: #6366F1; color: #fff; text-decoration: none; font-size: 17px; font-weight: 700; padding: 15px 20px; border-radius: 14px; transition: transform .15s ease, background .15s ease; -webkit-tap-highlight-color: transparent; }
  a.btn:active { transform: scale(.97); background: #4F46E5; }
  .tunnel { margin-top: 24px; padding-top: 20px; border-top: 1px dashed #E2E8F0; }
  .tunnel-title { font-size: 15px; font-weight: 700; color: #4F46E5; margin-bottom: 8px; }
  .tunnel-link { display: block; word-break: break-all; background: #EEF2FF; color: #4338CA; font-size: 13px; font-weight: 600; padding: 12px; border-radius: 10px; margin: 10px 0; text-decoration: none; direction: ltr; }
  .hint { margin-top: 12px; font-size: 12px; color: #94A3B8; line-height: 1.8; }
</style>
<script>
  window.addEventListener("DOMContentLoaded", () => {
    const link = document.querySelector(".tunnel-link");
    console.log("TUNNEL_URL=" + (link ? link.textContent : "none"));
  });
</script>
</head>
<body>
  <div class="card">
    <div class="logo">S</div>
    <h1>تطبيق SooQy</h1>
    <p>النسخة 1.0.0 — جاهزة للتثبيت على أندرويد</p>
    <div class="meta">الحجم: ${SIZE_MB} MB · موقّعة رسميًا</div>
    <a class="btn" href="/${APK_NAME}" download="${APK_NAME}">⬇ تحميل الـAPK</a>
    <div class="hint">إذا لم يبدأ التنزيل من الزر (المعاينة لا تدعم التنزيل)، استخدم الرابط العام بالأسفل في متصفح هاتفك.</div>
    ${tunnelSection}
  </div>
</body>
</html>`;
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/" + APK_NAME) {
      if (!fs.existsSync(apkPath)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("الملف غير موجود");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${APK_NAME}"`,
        "Content-Length": fs.statSync(apkPath).size,
        "Cache-Control": "no-store",
      });
      fs.createReadStream(apkPath).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage());
  })
  .listen(4174, "127.0.0.1", () => console.log("download server on http://127.0.0.1:4174/"));