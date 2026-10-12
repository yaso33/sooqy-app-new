// يُشغَّل بعد `vite build` عند النشر على Vercel.
//
// يجمّع خادم SSR (dist/server/server.js) في ملف CJS واحد مكتفٍ ذاتيًا داخل
// api/_generated/server.cjs — بلا import() ديناميكي ولا مسارات نسبية، كي تعمل
// دالة Vercel Serverless بموثوقية (مُختبَر: / و /explore يعيدان 200).

import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(root, "api", "_generated", "server.cjs");

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
