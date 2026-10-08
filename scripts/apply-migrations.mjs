#!/usr/bin/env node
/**
 * تطبيق هجرات SOOQY على قاعدة بيانات Supabase.
 * الاستخدام: node scripts/apply-migrations.mjs
 * يحتاج DATABASE_URL في البيئة أو في ملف .env (سطر DATABASE_URL=...)
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setDefaultResultOrder } from "node:dns";
import pg from "pg";

// بعض المضيفات (db.<ref>.supabase.co) تعطي IPv6 فقط — نفضّل IPv4 في هذه البيئة
setDefaultResultOrder("ipv4first");

const root = fileURLToPath(new URL("..", import.meta.url));

// قراءة .env يدويًا (بدون مكتبات إضافية)
function loadEnv() {
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* لا يوجد .env */ }
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL غير موجود. أضفه إلى /workspace/.env (من Supabase → Database → Connection string → URI)");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function applyFile(file, label, track = true) {
  const name = path.basename(file);
  if (track) {
    const { rows } = await client.query(
      "select 1 from public.schema_migrations where name = $1",
      [name],
    );
    if (rows.length > 0) {
      console.log(`⏭️  ${label} — مطبّقة مسبقًا (تخطي)`);
      return;
    }
  }
  const sql = readFileSync(file, "utf8");
  process.stdout.write(`⏳ ${label} ... `);
  try {
    await client.query("begin");
    await client.query(sql);
    if (track) {
      await client.query(
        "insert into public.schema_migrations (name) values ($1) on conflict do nothing",
        [name],
      );
    }
    await client.query("commit");
    console.log("✅");
  } catch (err) {
    await client.query("rollback");
    console.log("❌ فشل");
    console.error(String(err.message ?? err).slice(0, 1200));
    process.exitCode = 1;
    throw err;
  }
}

async function main() {
  await client.connect();
  console.log("🔌 متصل بقاعدة البيانات");

  const migrationsDir = path.join(root, "supabase", "migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.log("لا توجد هجرات");
    process.exit(0);
  }

  // جدول تتبع الهجرات المطبّقة (يجعل السكربت idempotent)
  await client.query(
    "create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );

  for (const f of files) {
    await applyFile(path.join(migrationsDir, f), `هجرة ${f}`);
  }

  // بيانات تجريبية (اختيارية — تُشغَّل فقط إذا كانت الجداول فارغة)
  const seedFile = path.join(root, "supabase", "seed.sql");
  const { rows } = await client.query("select count(*)::int as n from public.stores");
  if (rows[0].n === 0) {
    await applyFile(seedFile, "بيانات تجريبية (seed)");
  } else {
    console.log("⏭️  بيانات تجريبية: الجداول غير فارغة — تخطي");
  }

  console.log("\n🎉 اكتمل تطبيق قاعدة البيانات");
  await client.end();
}

main().catch(() => process.exit(1));