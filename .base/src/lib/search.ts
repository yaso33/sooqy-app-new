/** أدوات البحث: تطبيع النص، تصحيح الأخطاء الإملائية، والبحثات الأخيرة. */
import { useCallback, useSyncExternalStore } from "react";

const RECENT_KEY = "sooqy:recent-searches";
const MAX_RECENT = 8;

/** تطبيع النص قبل المقارنة/البحث: يشمل إزالة التشكيل وتوحيد
 *  الهمزات والألف المقصورة والتاء المربوطة والأرقام العربية-الهندية،
 *  لأن المستخدم يكتب بالعربية بينما البيانات مخزّنة بالفرنسية أحيانًا. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    // NFKD يفكّ الهمزة إلى علامة مركّبة (U+0654)، فنحذف كل علامات
    // التشكيل المركّبة عمومًا لا النطاق المحدود فقط.
    .replace(/\p{M}/gu, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** مسافة ليفنشتاين — لتصحيح الأخطاء الإملائية البسيطة (حرف واحد أو حرفين). */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const left = row[j - 1] ?? j - 1;
      const up = prev[j] ?? j;
      const diag = prev[j - 1] ?? j - 1;
      const cell = Math.min(left + 1, up + 1, diag + cost);
      row[j] = cell;
      if (cell < best) best = cell;
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length]!;
}

/** يصحّح الكلمة إن كانت قريبة من أحد المرشحين (خطأ إملائي شائع). */
export function correctTerm(term: string, candidates: readonly string[]): string | null {
  const t = normalizeText(term);
  if (t.length < 3) return null;
  const max = t.length <= 4 ? 1 : 2;
  let best: { word: string; dist: number } | null = null;
  for (const raw of candidates) {
    const c = normalizeText(raw);
    if (!c) continue;
    const d = editDistance(t, c, max);
    const sameStart = t[0] === c[0];
    if (d <= max && (sameStart || d <= 1) && (!best || d < best.dist)) {
      best = { word: raw, dist: d };
    }
  }
  return best ? best.word : null;
}

// ---------- البحثات الأخيرة ----------

let cache: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === "undefined") return [];
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(next: string[]): void {
  cache = next.slice(0, MAX_RECENT);
  loaded = true;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(cache));
  } catch {
    /* تجاهل */
  }
  listeners.forEach((cb) => cb());
}

export function getRecentSearches(): string[] {
  return read();
}

export function addRecentSearch(term: string): void {
  const t = term.trim();
  if (t.length < 2) return;
  const rest = read().filter((x) => normalizeText(x) !== normalizeText(t));
  write([t, ...rest]);
}

export function clearRecentSearches(): void {
  write([]);
}

/** نسخة ثابتة تُستخدم على الخادم — بدونها يفشل SSR (انظر src/lib/favorites.ts). */
const EMPTY: string[] = [];

export function useRecentSearches(): string[] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** مرادفات شائعة: المستخدم يكتب بلغة غير اسم التصنيف
 *  («موبا» مقابل «هواتف»، «fjwi» مقابل «فاكهة»). */
const SYNONYMS: Record<string, string[]> = {
  phones: ["موبا", "موبايل", "هاتف", "تليفون", "telephone", "smartphone", "gsm"],
  computers: ["كمبيوتر", "حاسوب", "لابتوب", "pc", "laptop"],
  grocery: ["بقالة", "مواد غذائية", "غذاء", "epicerie"],
  fashion: ["ملابس", "أزياء", "لباس", "veste"],
  beauty: ["مكياج", "عطور", "جمال", "cosmetique"],
  home: ["أثاث", "منزل", "أدوات منزلية", "maison"],
  sport: ["رياضة", "رياضي", "sport"],
  kids: ["أطفال", "طفل", "enfant"],
  electronics: ["إلكترونيات", "electronics"],
};

function expandQuery(term: string): string[] {
  const t = normalizeText(term);
  const out = new Set<string>([t]);
  for (const [key, words] of Object.entries(SYNONYMS)) {
    if (out.has(normalizeText(key))) for (const w of words) out.add(normalizeText(w));
    if (words.some((w) => normalizeText(w) === t)) out.add(normalizeText(key));
    for (const w of words) {
      const nw = normalizeText(w);
      if (nw.length >= 4 && t.length >= 4 && editDistance(t, nw) <= 1) {
        out.add(nw);
        out.add(normalizeText(key));
      }
    }
  }
  return [...out].filter(Boolean);
}

export type Suggestion =
  | { kind: "product"; id: string; label: string; hint: string; to: string }
  | { kind: "store"; id: string; label: string; hint: string; to: string }
  | { kind: "category"; id: string; label: string; hint: string; to: string };

/** يبني اقتراحات مدمجة من المنتجات والمتاجر والتصنيفات. */
export function buildSuggestions(
  term: string,
  data: {
    products: { id: string; name: string; category?: string | null; minPrice?: number }[];
    stores: { id: string; name: string; commune?: string | null }[];
    categories: readonly { id: string; label: string }[];
  },
  limit = 6,
): Suggestion[] {
  const t = normalizeText(term);
  if (!t) return [];

  const terms = expandQuery(term);
  const out: Suggestion[] = [];

  const tokens = terms.flatMap((x) => x.split(" ")).filter((w) => w.length >= 3);
  /** يطابق إن كان أحد الحقول يحتوي أحد صيغ البحث أو كلمة منها */
  const hit = (fields: (string | null | undefined)[]) => {
    const list = fields.map((h) => normalizeText(h ?? "")).filter(Boolean);
    if (terms.some((x) => list.some((h) => h.includes(x)))) return true;
    return tokens.some((tok) => list.some((h) => h.includes(tok)));
  };

  for (const p of data.products) {
    if (hit([p.name])) {
      out.push({
        kind: "product",
        id: p.id,
        label: p.name,
        hint: p.minPrice != null ? `${p.minPrice.toLocaleString("fr-DZ")} دج` : "منتج",
        to: `/products/${p.id}`,
      });
    }
  }
  for (const s of data.stores) {
    if (hit([s.name, s.commune])) {
      out.push({
        kind: "store",
        id: s.id,
        label: s.name,
        hint: s.commune || "متجر",
        to: `/stores/${s.id}`,
      });
    }
  }
  for (const c of data.categories) {
    if (hit([c.label, c.id])) {
      out.push({
        kind: "category",
        id: c.id,
        label: c.label,
        hint: "تصنيف",
        to: `/category/${c.id}`,
      });
    }
  }
  return out.slice(0, limit);
}