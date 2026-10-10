#!/usr/bin/env node
/**
 * تنظيف البيانات التجريبية (seed) من قاعدة بيانات SOOQY الحيوية.
 * الاستخدام:
 *   node scripts/cleanup-demo-data.mjs --dry-run   # يعرض الأعداد فقط دون حذف
 *   node scripts/cleanup-demo-data.mjs             # يحذف فعليًا
 * يحتاج SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في /workspace/.env
 *
 * يحذف فقط الصفوف المعروفة من supabase/seed.sql (المتاجر بمعرّفات slug الثابتة
 * والمنتجات بالمعرفات الثابتة) وكل ما يرتبط بها (عروض، صور، حجوزات، مراجعات، عناصر طلبات).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("..", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv() {
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* لا يوجد .env */
  }
}
loadEnv();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان في /workspace/.env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// معرفات seed الثابتة من supabase/seed.sql
const SEED_PRODUCT_IDS = [
  "11111111-1111-1111-1111-111111111101",
  "11111111-1111-1111-1111-111111111102",
  "11111111-1111-1111-1111-111111111103",
  "11111111-1111-1111-1111-111111111104",
  "11111111-1111-1111-1111-111111111105",
  "11111111-1111-1111-1111-111111111106",
  "11111111-1111-1111-1111-111111111107",
  "11111111-1111-1111-1111-111111111108",
  "11111111-1111-1111-1111-111111111109",
  "11111111-1111-1111-1111-111111111110",
];
const SEED_STORE_SLUGS = [
  "al-amana-electronics",
  "dar-al-anaka",
  "jamalik-cosmetics",
  "madina-sport",
  "sabah-coffee",
];

async function countAndDelete(table, filter) {
  const { count, error: cErr } = await supabase.from(table).select("id", { count: "exact", head: true }).match(filter);
  if (cErr) throw new Error(`${table}: ${cErr.message}`);
  if (count === 0) return 0;
  if (DRY_RUN) return count;
  const { error } = await supabase.from(table).delete().match(filter);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count;
}

async function countAndDeleteIn(table, column, ids) {
  if (!ids.length) return 0;
  const { count, error: cErr } = await supabase.from(table).select("id", { count: "exact", head: true }).in(column, ids);
  if (cErr) throw new Error(`${table}: ${cErr.message}`);
  if (count === 0) return 0;
  if (DRY_RUN) return count;
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count;
}

async function main() {
  console.log(DRY_RUN ? "🔍 وضع الاستعراض (--dry-run) — لن يُحذف شيء" : "🧹 تنظيف فعلي للبيانات التجريبية");
  console.log("🔌 الاتصال بـ Supabase ...");

  // 1) متاجر seed
  const { data: seedStores, error: sErr } = await supabase
    .from("stores").select("id, name").in("slug", SEED_STORE_SLUGS);
  if (sErr) throw sErr;
  const storeIds = (seedStores ?? []).map((s) => s.id);

  // 2) عروض seed (منتجات seed أو متاجر seed)
  const { data: seedOffers, error: oErr } = await supabase
    .from("store_offers").select("id").in("product_id", SEED_PRODUCT_IDS);
  if (oErr) throw oErr;
  const offerIdsByProduct = (seedOffers ?? []).map((o) => o.id);
  const { data: seedOffersByStore, error: osErr } = await supabase
    .from("store_offers").select("id").in("store_id", storeIds);
  if (osErr) throw osErr;
  const offerIds = [...new Set([...offerIdsByProduct, ...(seedOffersByStore ?? []).map((o) => o.id)])];

  const targetIds = [...SEED_PRODUCT_IDS, ...storeIds];

  console.log(`\nوجدنا: ${storeIds.length} متجر seed، ${offerIds.length} عرض seed`);

  const report = [];
  report.push(["مراجعات (reviews)", await countAndDeleteIn("reviews", "target_id", targetIds)]);
  report.push(["عناصر طلبات (order_items)", await countAndDeleteIn("order_items", "offer_id", offerIds)]);
  report.push(["حجوزات (reservations)", await countAndDeleteIn("reservations", "offer_id", offerIds)]);
  report.push(["صور منتجات (product_images)", await countAndDeleteIn("product_images", "offer_id", offerIds)]);
  report.push(["عروض (store_offers)", await countAndDeleteIn("store_offers", "id", offerIds)]);
  report.push(["منتجات (products)", await countAndDeleteIn("products", "id", SEED_PRODUCT_IDS)]);
  report.push(["متاجر (stores)", await countAndDeleteIn("stores", "id", storeIds)]);

  const total = report.reduce((s, [, n]) => s + n, 0);
  console.log("\n📋 الملخص:");
  for (const [label, n] of report) console.log(`  ${label}: ${n}`);
  console.log(`\n${DRY_RUN ? "سَيُحذف" : "حُذف"} ${total} صفًا إجمالًا.`);
  if (DRY_RUN) {
    console.log("\nلتنفيذ الحذف فعليًا: node scripts/cleanup-demo-data.mjs");
  } else {
    console.log("\n✅ اكتمل تنظيف البيانات التجريبية — لم يبقَ أي صف seed.");
  }
}

main().catch((e) => {
  console.error("❌ فشل التنظيف:", e.message ?? e);
  process.exit(1);
});