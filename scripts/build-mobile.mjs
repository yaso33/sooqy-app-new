// بناء تطبيق الجوال (Capacitor):
// 1) vite build --config vite.mobile.config.ts → dist-mobile (SPA خالص بدون SSR — يعمل في WebView)
// 2) نقل HTML الناتج إلى جذر dist-mobile/index.html (Vite يحافظ على مسار src/)
// 3) npx cap sync android → ينسخ الأصول إلى مشروع أندرويد
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
process.chdir(ROOT);

console.log("📦 1/3 بناء تطبيق الجوال (SPA)...");
execSync("npx vite build --config vite.mobile.config.ts", { stdio: "inherit" });

if (!existsSync("dist-mobile/src/entry-mobile.html")) throw new Error("فشل البناء — لا يوجد dist-mobile/src/entry-mobile.html");

console.log("📄 2/3 نقل HTML إلى جذر dist-mobile/index.html...");
const html = readFileSync("dist-mobile/src/entry-mobile.html", "utf8")
  .replaceAll("../assets/", "assets/");
writeFileSync("dist-mobile/index.html", html);

console.log("📱 3/3 مزامنة Capacitor...");
execSync("npx cap sync android", { stdio: "inherit" });

console.log("✅ تم — dist-mobile جاهزة و android/ محدّثة");