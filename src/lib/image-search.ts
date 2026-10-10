/** بحث بالصور — يعمل داخل المتصفح دون أي خدمة خارجية:
 *  نستخرج الملامح البصرية (اللون الغالب + البُعد + كون لها خلفية بيضاء)
 *  من صورة المستخدم، ثم نحسب تشابهها مع صور المنتجات المرشحة.
 */

export type VisualProfile = {
  /** اللون الغالب — hex */
  dominant: string;
  /** عدد الألوان المميزة */
  colors: string[];
  /** نسبة البكسلات الفاتحة (خلفية بيضاء غالبًا) 0..1 */
  whiteness: number;
  /** نسبة البكسلات الشفافة (صورة أيقونة/شعار) 0..1 */
  transparency: number;
  /** نسبة Picasso: عدد الألوان الفريدة / البكسلات — صورة مسطّحة */
  colorfulness: number;
  width: number;
  height: number;
};

export type VisualMatch = { score: number; reasons: string[] };

const MAX_SIDE = 96;

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** يحوّل RGB إلى HSL — المسافة اللونية تُقاس بالحدس البشري لا بالـRGB الخام */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

/** مسافة لونية دائرية في فضاء HSL — الدرجة الفاصلة عند 360 درجة */
function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/** يحسب البصمة البصرية من بيانات بكسل RGBA */
export function profileFromPixels(data: Uint8ClampedArray, width: number, height: number): VisualProfile {
  const buckets = new Map<number, number>();
  let white = 0;
  let transparent = 0;
  let counted = 0;
  let sampledCount = 0;
  let sumH = 0;
  let sumS = 0;
  let sumL = 0;

  // نتخطى بكسلات متفرقة للحفاظ على الأداء على الصور الكبيرة
  const step = Math.max(1, Math.floor((width * height) / 6000));

  for (let i = 0; i < width * height; i += step) {
    sampledCount++;
    const o = i * 4;
    const r = data[o] ?? 0;
    const g = data[o + 1] ?? 0;
    const b = data[o + 2] ?? 0;
    const a = data[o + 3] ?? 255;

    if (a < 128) {
      transparent++;
      continue;
    }
    counted++;
    const [h, s, l] = rgbToHsl(r, g, b);
    sumH += h;
    sumS += s;
    sumL += l;
    if (l > 0.92 && s < 0.12) white++;

    // ندرّج اللون في شبكة 16 مستوى لكل قناة لتجميع الألوان المتقاربة
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const sampled = Math.max(1, sampledCount);
  const total = Math.max(1, counted);
  const colors = [...buckets.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 4)
    .map(([key]) => {
      const r = ((key >> 8) & 0xf) * 17;
      const g = ((key >> 4) & 0xf) * 17;
      const b = (key & 0xf) * 17;
      return rgbToHex(r, g, b);
    });

  const dominant = colors[0] ?? "#808080";
  return {
    dominant,
    colors,
    whiteness: white / total,
    transparency: transparent / sampled,
    colorfulness: buckets.size / total,
    width,
    height,
  };
}

function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0.5];
  return rgbToHsl(
    parseInt(m[1] ?? "0", 16),
    parseInt(m[2] ?? "0", 16),
    parseInt(m[3] ?? "0", 16),
  );
}

/** تشابه بصري بين صورتين — 0 (لا التشابه) .. 1 */
export function visualMatch(a: VisualProfile, b: VisualProfile): VisualMatch {
  const reasons: string[] = [];
  let score = 0;

  const [ah, as, al] = hexToHsl(a.dominant);
  const [bh, bs, bl] = hexToHsl(b.dominant);
  const hd = hueDistance(ah, bh);
  const sd = Math.abs(as - bs);
  const ld = Math.abs(al - bl);

  // تشابه اللون الغالب
  const colorScore = Math.max(0, 1 - (hd / 180) * 0.5 - sd * 0.3 - ld * 0.4);
  score += colorScore * 0.45;
  if (colorScore > 0.6) reasons.push("لون مشابه");

  // خلفية بيضاء: صورتا منتج عادةً على خلفية بيضاء
  const whiteSim = 1 - Math.min(1, Math.abs(a.whiteness - b.whiteness) * 2.5);
  score += whiteSim * 0.15;
  if (whiteSim > 0.75) reasons.push("خلفية مشابهة");

  // شفافية: الشعار/الأيقونة لها شفافية عالية
  const alphaSim = 1 - Math.min(1, Math.abs(a.transparency - b.transparency) * 2);
  score += alphaSim * 0.1;
  if (alphaSim > 0.8) reasons.push("خلفية شفافة");

  // تنوّع الألوان: صورة مسطّحة (شعار) مقابل صورة واقعية
  const flat = a.colorfulness < 0.05;
  const flatSim = 1 - Math.min(1, Math.abs(a.colorfulness - b.colorfulness) * 4);
  score += flatSim * 0.15;
  if (flatSim > 0.7) reasons.push(flat ? "تصميم مسطّح" : "صورة واقعية");

  // أبعاد متقاربة
  const ar1 = a.width / Math.max(1, a.height);
  const ar2 = b.width / Math.max(1, b.height);
  const arSim = 1 - Math.min(1, Math.abs(ar1 - ar2) / 1.5);
  score += arSim * 0.15;

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

/** يرسم الصورة على canvas بحجم صغير لإ extracting بكسلات محدودة */
export function drawToPixels(
  source: CanvasImageSource,
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("تعذّر تجهيز معالجة الصورة");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
}

/** البصمة من ملف صورة يختاره المستخدم */
export function profileFromFile(file: File): Promise<VisualProfile> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("المتصفح غير متاح"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const { data, width, height } = drawToPixels(img, img.naturalWidth, img.naturalHeight);
        resolve(profileFromPixels(data, width, height));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذّر قراءة الصورة"));
    };
    img.src = url;
  });
}

const cache = new Map<string, VisualProfile>();

/** بصمة صورة منتج من رابط (مع ذاكرة مؤقتة) */
export function profileFromUrl(url: string): Promise<VisualProfile | null> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    // نحتاج CORS لقراءة بكسلات صورة من نطاق آخر
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const { data, width, height } = drawToPixels(img, img.naturalWidth, img.naturalHeight);
        const p = profileFromPixels(data, width, height);
        cache.set(url, p);
        resolve(p);
      } catch {
        // صورة من نطاق بلا CORS: نتجاهلها بدل الفشل
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** يرتّب المنتجات حسب التشابه البصري مع صورة المستخدم */
export function rankByVisual(
  query: VisualProfile,
  items: { id: string; url: string | null }[],
  limit = 24,
): Promise<{ id: string; score: number; reasons: string[] }[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.url) return { id: item.id, score: 0, reasons: [] };
      const p = await profileFromUrl(item.url);
      if (!p) return { id: item.id, score: 0, reasons: [] };
      return { id: item.id, ...visualMatch(query, p) };
    }),
  ).then((all) =>
    all
      .filter((x) => x.score > 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit),
  );
}