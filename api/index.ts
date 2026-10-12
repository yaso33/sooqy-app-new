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
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[vercel] handler error", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/html; charset=utf-8");
    }
    res.end("<!DOCTYPE html><html lang=\"ar\" dir=\"rtl\"><body><h1>تعذّر تحميل الصفحة</h1><p>حدث خطأ غير متوقع. أعد المحاولة بعد قليل.</p></body></html>");
  }
}
