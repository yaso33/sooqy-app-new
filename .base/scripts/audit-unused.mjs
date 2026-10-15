// تحليل وصول (reachability): يبدأ من نقاط الدخول ويتتبع كل استيراد
// أي ملف src غير قابل للوصول = ميت وقابل للحذف. يحذر من الاستيراد الديناميكي المتغير.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SRC = path.join(root, "src");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function resolve(spec, fromDir) {
  let base = null;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(fromDir, spec);
  else return null; // حزمة خارجية
  const tries = [base, base + ".ts", base + ".tsx", base + ".js", path.join(base, "index.ts"), path.join(base, "index.tsx")];
  for (const t of tries) if (fs.existsSync(t) && fs.statSync(t).isFile()) return t;
  return "__UNRESOLVED__" + spec;
}

// نقاط الدخول: routes + router/server/start + الاختبارات + الكونفيج
const roots = [
  ...walk(path.join(SRC, "routes")),
  ...walk(path.join(SRC, "test")),
  path.join(SRC, "router.tsx"),
  path.join(SRC, "server.ts"),
  path.join(SRC, "start.ts"),
  ...walk(SRC).filter((f) => /\.test\.tsx?$/.test(f)),
];

const IMPORT_RE = /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)["']([^"']+)["']/g;
const DYN_TEMPLATE = /import\s*\(\s*[`'"][^`'"]*\$\{/g;

const seen = new Set();
const unresolved = new Set();
const dynWarnings = [];
const queue = roots.filter((f) => fs.existsSync(f));

while (queue.length) {
  const f = queue.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  if (!/\.(ts|tsx)$/.test(f)) continue;
  const txt = fs.readFileSync(f, "utf8");
  if (DYN_TEMPLATE.test(txt)) dynWarnings.push(path.relative(root, f));
  DYN_TEMPLATE.lastIndex = 0;
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(txt))) {
    const r = resolve(m[1], path.dirname(f));
    if (!r) continue;
    if (r.startsWith("__UNRESOLVED__")) { unresolved.add(r.slice(14) + "  ← " + path.relative(root, f)); continue; }
    if (!seen.has(r)) queue.push(r);
  }
}

const allSrc = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const dead = allSrc.filter((f) => !seen.has(f));

console.log(`=== إجمالي ملفات src: ${allSrc.length} · قابلة للوصول: ${seen.size} · ميتة: ${dead.length} ===`);
dead.forEach((d) => console.log(" DEAD", path.relative(root, d)));
console.log("=== استيراد ديناميكي متغير (تحقق يدوي) ===");
console.log(dynWarnings.length ? dynWarnings.join("\n") : " لا شيء");
console.log("=== مسارات غير محلولة ===");
console.log(unresolved.size ? [...unresolved].join("\n") : " لا شيء");
