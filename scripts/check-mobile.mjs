// فحص ذاتي: يبدأ خادم dist-mobile ويجلب الصفحات للتحقق من سلامتها
// (بديل check_preview الذي لا يلتقط السجلات في هذه البيئة)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist-mobile");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

const server = http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(root, urlPath);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(root, "index.html");
    }
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  })
  .listen(0, "127.0.0.1", async () => {
    const port = server.address().port;
    const get = (p) => new Promise((resolve) => {
      http.get({ host: "127.0.0.1", port, path: p }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body, type: res.headers["content-type"] }));
      }).on("error", (e) => resolve({ status: 0, body: String(e), type: "" }));
    });

    const html = await get("/");
    console.log("GET / →", html.status, html.type, html.body.length, "بايت");
    const jsMatch = html.body.match(/src="([^"]+\.js)"/);
    const cssMatch = html.body.match(/href="([^"]+\.css)"/);
    if (jsMatch) {
      const js = await get("/" + jsMatch[1]);
      console.log("GET", jsMatch[1], "→", js.status, js.type, js.body.length, "بايت");
    } else console.log("⚠️ لا يوجد script JS في index.html");
    if (cssMatch) {
      const css = await get("/" + cssMatch[1]);
      console.log("GET", cssMatch[1], "→", css.status, css.type, css.body.length, "بايت");
    }
    console.log("root:", root);
    server.close();
    process.exit(0);
  });