// دالة Vercel (Serverless) لموقع SooQy — TanStack Start SSR.
//
// المسار:
//   1) الملفات الثابتة في dist/client تُخدَم مباشرة من طبقة Vercel الثابتة.
//   2) أي مسار آخر يصل هنا، ويُمرَّر إلى معالج SSR في TanStack Start.
//
// الاستيراد الساكن لحزمة الخادم المُجمّعة (server.cjs) ضروري كي يتتبّعها
// مُحزِّم Vercel ويضمّها إلى الدالة. لا تستبدله بـ import() ديناميكي.

import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import serverModule from "./_generated/server.cjs";

type Fetcher = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const mod = serverModule as unknown as Fetcher & { default?: Fetcher };
const app: Fetcher = mod.default ?? mod;

const CLIENT_DIR = join(process.cwd(), "dist", "client");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

/** يخدم ملفًا ثابتًا من dist/client إن وُجد (شبكة أمان إن لم تخدمه Vercel). */
async function tryStatic(pathname: string): Promise<Response | null> {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  if (!rel || rel.includes("..")) return null;
  const filePath = join(CLIENT_DIR, rel);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    const body = await readFile(filePath);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
        "cache-control": rel.startsWith("assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return null;
  }
}

function readBody(req: IncomingMessage): Promise<Uint8Array | undefined> {
  return new Promise((resolve) => {
    const method = (req.method ?? "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") return resolve(undefined);
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(chunks.length ? new Uint8Array(Buffer.concat(chunks)) : undefined));
    req.on("error", () => resolve(undefined));
  });
}

/** يخفي أي سر محتمل من رسالة الخطأ قبل عرضها. */
function sanitizeMessage(message: string): string {
  return message
    .replace(/sb_[A-Za-z0-9_-]{6,}/g, "sb_•••")
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, "eyJ•••")
    .replace(/[A-Za-z0-9_-]{40,}/g, "•••")
    .slice(0, 400);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** حضور المتغيرات فقط (✓/✗) — لا تُطبع أي قيمة، فهذا آمن ومفيد للتشخيص. */
function envPresence(): string {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SOOQY_CRON_SECRET",
  ];
  return keys.map((k) => `${k}=${process.env[k] ? "✓" : "✗"}`).join(" · ");
}

/** يعرض صفحة خطأ عربية مع تفاصيل تقنية منظَّفة تساعد على تحديد السبب. */
function reportFailure(res: ServerResponse, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const presence = envPresence();
  console.error("[vercel] handler error:", err.message);
  console.error("[vercel] stack:", err.stack);
  console.error("[vercel] env presence:", presence);

  if (res.headersSent) {
    res.end();
    return;
  }
  res.statusCode = 500;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(
    `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>تعذّر تحميل الصفحة</title></head>` +
      `<body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.7;background:#F8FAFC;color:#111827">` +
      `<h1 style="color:#4F46E5">تعذّر تحميل الصفحة</h1>` +
      `<p>حدث خطأ غير متوقع. أعد المحاولة بعد قليل.</p>` +
      `<details style="margin-top:16px"><summary style="cursor:pointer;color:#4F46E5">تفاصيل تقنية (للدعم)</summary>` +
      `<p style="font-size:13px"><b>الرسالة:</b> ${escapeHtml(sanitizeMessage(err.message))}</p>` +
      `<p style="font-size:13px"><b>متغيرات البيئة:</b> ${escapeHtml(presence)}</p>` +
      `</details></body></html>`,
  );
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string) || "localhost";
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const url = new URL(req.url ?? "/", `${proto}://${host}`);

    const staticRes = await tryStatic(url.pathname);
    if (staticRes) {
      res.statusCode = staticRes.status;
      staticRes.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await staticRes.arrayBuffer()));
      return;
    }

    const body = await readBody(req);
    const request = new Request(url, {
      method: req.method ?? "GET",
      headers: req.headers as Record<string, string>,
      body: body as BodyInit | undefined,
      // مطلوب في Node عند إرسال جسم الطلب
      ...(body ? { duplex: "half" } : {}),
    } as RequestInit);

    const response = await app.fetch(request, process.env, {});
    res.statusCode = response.status;
    // set-cookie قد تكون عدة ترويسات، و Headers.forEach يدمجها بفاصلة فتُفسد الجلسة.
    const headersWithCookies = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = typeof headersWithCookies.getSetCookie === "function" ? headersWithCookies.getSetCookie() : [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });
    if (setCookies.length) res.setHeader("set-cookie", setCookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    reportFailure(res, error);
  }
}
