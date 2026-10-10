// سكربت تشخيص مؤقت: يفحص ما يخدمه Vite في وضع التطوير لصفحة الخريطة.
import { createServer } from "vite";

const PORT = 5199;
const server = await createServer({
  configFile: "vite.config.ts",
  server: { port: PORT, host: "127.0.0.1", strictPort: true },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${PORT}`;

async function probe(url, label) {
  try {
    const res = await fetch(url);
    const type = res.headers.get("content-type");
    const text = await res.text();
    console.log(`${label}: status=${res.status} type=${type} bytes=${text.length}`);
    return text;
  } catch (e) {
    console.log(`${label}: FETCH_ERR ${e.message}`);
    return "";
  }
}

// 1) كيف تخدم Vite ملف الـ worker الذي نمرّره إلى setWorkerUrl؟
await probe(`${base}/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs`, "worker(.mjs مباشر)");
await probe(`${base}/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs?url`, "worker(?url)");

// 2) ما القيمة النهائية التي يحصل عليها StoreMap لعنوان الـ worker؟
const mapMod = await probe(`${base}/src/components/sooqy/StoreMap.tsx`, "StoreMap(مُحوّل)");
const hits = mapMod.match(/[^\s"']*maplibre-gl-worker[^\s"']*/g) ?? [];
console.log("عناوين worker في الموديول المُحوّل:", [...new Set(hits)].join(" | ") || "(لا شيء)");

// 3) هل يُحمَّل CSS الخاص بـ MapLibre؟
await probe(`${base}/node_modules/maplibre-gl/dist/maplibre-gl.css`, "maplibre CSS");

// 4) هل يصل HTML صفحة الخريطة من الخادم (SSR) بلا خطأ؟
const html = await probe(`${base}/map`, "صفحة /map");
console.log("  يحتوي رسالة خطأ؟", /Internal Server Error|Error:/i.test(html));

await server.close();
process.exit(0);
