/**
 * شجرة تصنيفات SooQy — المصدر الوحيد للتصنيفات في التطبيق.
 *
 * لإضافة تصنيف جديد مستقبلًا: أضف عنصرًا هنا (وفقط هنا) — كل الواجهة تشتقّ منه:
 * شرائح الرئيسية، شبكة الاستكشاف، منتقيات الاستوديو، فلاتر البحث، ومقترحات البحث.
 * الهجرة `supabase/migrations/202610160001_taxonomy.sql` تُعبّئ نفس الشجرة في جدول
 * `public.categories` (بيانات لا بنية) — أبقِ الاثنين متطابقين عند الإضافة.
 */

export type CategoryNode = {
  /** المعرّف الثابت — يُخزَّن في `products.category` و`stores.category` (لا يُترجم ولا يتغيّر) */
  id: string;
  label: string;
  emoji: string;
  /** وصف قصير يظهر في بطاقة التصنيف الرئيسي */
  hint: string;
  /** تدرّج لوني لأيقونة البطاقة (Tailwind) — ضمن عائلة Indigo/Violet للهوية */
  gradient: string;
  children?: CategoryNode[];
};

export const MAIN_CATEGORIES: CategoryNode[] = [
  {
    id: "fashion",
    label: "الأزياء والملابس",
    emoji: "👗",
    hint: "ملابس وأحذية وحقائب",
    gradient: "from-indigo-500 to-violet-500",
    children: [
      { id: "clothes", label: "الملابس", emoji: "👕", hint: "", gradient: "from-indigo-500 to-violet-500" },
      { id: "shoes", label: "الأحذية", emoji: "👟", hint: "", gradient: "from-indigo-500 to-violet-500" },
      { id: "bags", label: "الحقائب والإكسسوارات", emoji: "👜", hint: "", gradient: "from-indigo-500 to-violet-500" },
    ],
  },
  {
    id: "electronics",
    label: "الإلكترونيات",
    emoji: "📱",
    hint: "هواتف وحواسيب وأجهزة",
    gradient: "from-sky-500 to-blue-600",
    children: [
      { id: "phones", label: "الهواتف والأجهزة اللوحية", emoji: "📱", hint: "", gradient: "from-sky-500 to-blue-600" },
      { id: "computers", label: "الحواسيب ومستلزماتها", emoji: "💻", hint: "", gradient: "from-sky-500 to-blue-600" },
      { id: "gadgets", label: "الأجهزة الإلكترونية", emoji: "🎧", hint: "", gradient: "from-sky-500 to-blue-600" },
      { id: "phone-accessories", label: "إكسسوارات الهواتف", emoji: "🔌", hint: "", gradient: "from-sky-500 to-blue-600" },
    ],
  },
  {
    id: "beauty",
    label: "الجمال والعناية الشخصية",
    emoji: "💄",
    hint: "عطور وتجميل وعناية",
    gradient: "from-fuchsia-500 to-pink-500",
    children: [
      { id: "perfumes", label: "العطور", emoji: "🌸", hint: "", gradient: "from-fuchsia-500 to-pink-500" },
      { id: "makeup", label: "مستحضرات التجميل", emoji: "💄", hint: "", gradient: "from-fuchsia-500 to-pink-500" },
      { id: "skincare", label: "العناية بالبشرة والشعر", emoji: "🧴", hint: "", gradient: "from-fuchsia-500 to-pink-500" },
    ],
  },
  {
    id: "home",
    label: "المنزل والديكور",
    emoji: "🛋️",
    hint: "أثاث وأدوات وديكور",
    gradient: "from-teal-500 to-emerald-600",
    children: [
      { id: "furniture", label: "الأثاث", emoji: "🪑", hint: "", gradient: "from-teal-500 to-emerald-600" },
      { id: "home-tools", label: "الأدوات المنزلية", emoji: "🧺", hint: "", gradient: "from-teal-500 to-emerald-600" },
      { id: "decor", label: "الديكور والإضاءة", emoji: "💡", hint: "", gradient: "from-teal-500 to-emerald-600" },
      { id: "kitchenware", label: "أدوات المطبخ", emoji: "🍽️", hint: "", gradient: "from-teal-500 to-emerald-600" },
    ],
  },
  {
    id: "kids",
    label: "الأطفال والألعاب",
    emoji: "🧸",
    hint: "ملابس وألعاب ومستلزمات",
    gradient: "from-cyan-400 to-sky-500",
    children: [
      { id: "kids-clothes", label: "ملابس الأطفال", emoji: "👶", hint: "", gradient: "from-cyan-400 to-sky-500" },
      { id: "toys", label: "ألعاب الأطفال", emoji: "🧸", hint: "", gradient: "from-cyan-400 to-sky-500" },
      { id: "kids-essentials", label: "مستلزمات الأطفال", emoji: "🍼", hint: "", gradient: "from-cyan-400 to-sky-500" },
    ],
  },
  {
    id: "sports",
    label: "الرياضة والترفيه",
    emoji: "🏀",
    hint: "رياضة وهوايات",
    gradient: "from-emerald-500 to-teal-600",
    children: [
      { id: "sportswear", label: "الملابس والأحذية الرياضية", emoji: "👟", hint: "", gradient: "from-emerald-500 to-teal-600" },
      { id: "sports-gear", label: "المعدات الرياضية", emoji: "🏋️", hint: "", gradient: "from-emerald-500 to-teal-600" },
      { id: "hobbies", label: "مستلزمات الهوايات", emoji: "🎣", hint: "", gradient: "from-emerald-500 to-teal-600" },
    ],
  },
  {
    id: "food",
    label: "الأغذية والحلويات",
    emoji: "🍰",
    hint: "حلويات ومنتجات غذائية",
    gradient: "from-rose-400 to-pink-500",
    children: [
      { id: "sweets", label: "الحلويات والمخبوزات", emoji: "🍰", hint: "", gradient: "from-rose-400 to-pink-500" },
      { id: "groceries", label: "المنتجات الغذائية", emoji: "🛒", hint: "", gradient: "from-rose-400 to-pink-500" },
      { id: "home-food", label: "المأكولات المنزلية", emoji: "🥘", hint: "", gradient: "from-rose-400 to-pink-500" },
    ],
  },
  {
    id: "gifts-crafts",
    label: "الهدايا والحرف اليدوية",
    emoji: "🎁",
    hint: "هدايا وحرف وقرطاسية",
    gradient: "from-violet-500 to-purple-600",
    children: [
      { id: "gifts", label: "الهدايا", emoji: "🎁", hint: "", gradient: "from-violet-500 to-purple-600" },
      { id: "handmade", label: "المنتجات اليدوية", emoji: "🧶", hint: "", gradient: "from-violet-500 to-purple-600" },
      { id: "stationery", label: "القرطاسية ومستلزمات المكتب", emoji: "✏️", hint: "", gradient: "from-violet-500 to-purple-600" },
    ],
  },
  {
    id: "digital",
    label: "الخدمات والمشاريع الرقمية",
    emoji: "💻",
    hint: "تصميم وتطوير وخدمات",
    gradient: "from-indigo-600 to-blue-700",
    children: [
      { id: "design", label: "التصميم والجرافيك", emoji: "🎨", hint: "", gradient: "from-indigo-600 to-blue-700" },
      { id: "web-dev", label: "تطوير المواقع والتطبيقات", emoji: "⌨️", hint: "", gradient: "from-indigo-600 to-blue-700" },
      { id: "digital-services", label: "الخدمات الرقمية", emoji: "🛠️", hint: "", gradient: "from-indigo-600 to-blue-700" },
      { id: "digital-products", label: "المنتجات الرقمية", emoji: "📦", hint: "", gradient: "from-indigo-600 to-blue-700" },
    ],
  },
  {
    id: "cars",
    label: "السيارات وملحقاتها",
    emoji: "🚗",
    hint: "إكسسوارات وقطع غيار",
    gradient: "from-slate-600 to-slate-800",
    children: [
      { id: "car-accessories", label: "إكسسوارات السيارات", emoji: "🚙", hint: "", gradient: "from-slate-600 to-slate-800" },
      { id: "car-parts", label: "قطع الغيار", emoji: "🔧", hint: "", gradient: "from-slate-600 to-slate-800" },
      { id: "car-maintenance", label: "مستلزمات الصيانة", emoji: "🧰", hint: "", gradient: "from-slate-600 to-slate-800" },
    ],
  },
];

export const OTHER_CATEGORIES: CategoryNode[] = [
  { id: "books", label: "الكتب والتعليم", emoji: "📚", hint: "كتب ومستلزمات دراسية", gradient: "from-slate-500 to-slate-700" },
  { id: "industrial", label: "الأدوات المهنية والصناعية", emoji: "⚙️", hint: "عدد ومعدات مهنية", gradient: "from-slate-500 to-slate-700" },
  { id: "used", label: "المنتجات المستعملة", emoji: "♻️", hint: "سلع بحالة جيدة", gradient: "from-slate-500 to-slate-700" },
  { id: "flowers", label: "الزهور والنباتات", emoji: "🌿", hint: "زهور ونباتات منزلية", gradient: "from-slate-500 to-slate-700" },
  { id: "pets", label: "مستلزمات الحيوانات الأليفة", emoji: "🐾", hint: "طعام ومستلزمات", gradient: "from-slate-500 to-slate-700" },
  { id: "misc", label: "منتجات أخرى", emoji: "🛍️", hint: "كل ما لا يندرج أعلاه", gradient: "from-slate-500 to-slate-700" },
];

export const ALL_CATEGORIES: CategoryNode[] = [...MAIN_CATEGORIES, ...OTHER_CATEGORIES];

/** معرّفات قديمة ما زالت مخزّنة في `products.category` — تُقرأ وتُعرض بالتصنيف الجديد المقابل */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  cosmetics: "makeup",
  capsules: "groceries",
  other: "misc",
};

const FLAT: CategoryNode[] = ALL_CATEGORIES.flatMap((c) => [c, ...(c.children ?? [])]);
const BY_ID = new Map<string, CategoryNode>(FLAT.map((c) => [c.id, c]));
const PARENT_OF = new Map<string, string>();
for (const main of MAIN_CATEGORIES) for (const child of main.children ?? []) PARENT_OF.set(child.id, main.id);

/** يحوّل أي معرّف قديم إلى معرّفه الجديد (وإلا يعيده كما هو) */
export function resolveCategoryId(id: string | null | undefined): string {
  if (!id) return "";
  return LEGACY_CATEGORY_MAP[id] ?? id;
}

export function categoryById(id: string | null | undefined): CategoryNode | undefined {
  return BY_ID.get(resolveCategoryId(id));
}

export function categoryLabel(id: string | null | undefined): string {
  if (!id) return "";
  return categoryById(id)?.label ?? id;
}

export function categoryEmoji(id: string | null | undefined): string {
  return categoryById(id)?.emoji ?? "🛍️";
}

export function categoryGradient(id: string | null | undefined): string {
  return categoryById(id)?.gradient ?? "from-slate-500 to-slate-700";
}

export function categoryHint(id: string | null | undefined): string {
  return categoryById(id)?.hint ?? "";
}

export function isMainCategory(id: string | null | undefined): boolean {
  const resolved = resolveCategoryId(id);
  return MAIN_CATEGORIES.some((c) => c.id === resolved);
}

/** التصنيف الرئيسي لتصنيف فرعي (أو نفسه إن كان رئيسيًا) */
export function parentOf(id: string | null | undefined): CategoryNode | undefined {
  const resolved = resolveCategoryId(id);
  const parentId = PARENT_OF.get(resolved);
  return parentId ? BY_ID.get(parentId) : BY_ID.get(resolved);
}

export function childrenOf(id: string | null | undefined): CategoryNode[] {
  return categoryById(id)?.children ?? [];
}

/**
 * كل المعرّفات التي يجب أن يطابقها الفلتر: التصنيف نفسه + فرعياته + المعرّفات القديمة
 * التي تشير إليه. تُستعمل في `.in("product.category", categoryIds(id))`.
 */
export function categoryIds(id: string | null | undefined): string[] {
  const resolved = resolveCategoryId(id);
  if (!resolved) return [];
  const node = BY_ID.get(resolved);
  const ids = new Set<string>(node ? [node.id, ...(node.children ?? []).map((c) => c.id)] : [resolved]);
  for (const [legacy, dest] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (ids.has(dest)) ids.add(legacy);
  }
  return [...ids];
}

/** مسار التصنيف من الرئيسي إلى الفرعي: [الأزياء والملابس, الأحذية] */
export function pathOf(id: string | null | undefined): CategoryNode[] {
  const node = categoryById(id);
  if (!node) return [];
  const parentId = PARENT_OF.get(node.id);
  const parent = parentId ? BY_ID.get(parentId) : undefined;
  return parent ? [parent, node] : [node];
}

/** مسار نصي للعرض: «الأزياء والملابس ← الأحذية» */
export function pathLabel(id: string | null | undefined): string {
  return pathOf(id)
    .map((n) => n.label)
    .join(" ← ");
}

export type CategoryOptionGroup = { label: string; options: { value: string; label: string }[] };

/** مجموعات المنتقيات: كل تصنيف رئيسي مع فرعياته، ثم «تصنيفات أخرى» */
export function categoryOptionGroups(): CategoryOptionGroup[] {
  const groups: CategoryOptionGroup[] = MAIN_CATEGORIES.map((main) => ({
    label: main.label,
    options: (main.children ?? []).map((c) => ({ value: c.id, label: c.label })),
  }));
  groups.push({
    label: "تصنيفات أخرى",
    options: OTHER_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
  });
  return groups;
}

/** قائمة مسطّحة (للمنتقيات البسيطة والبحث) */
export function categoryOptionList(): { value: string; label: string }[] {
  return FLAT.map((c) => ({ value: c.id, label: c.label }));
}

/** قائمة تصنيفات مسطّحة تُغذّي مقترحات البحث (رئيسية + فرعية + أخرى) */
export function flattenedCategoryOptions(): { id: string; label: string }[] {
  return ALL_CATEGORIES.flatMap((c) => [
    { id: c.id, label: c.label },
    ...(c.children ?? []).map((x) => ({ id: x.id, label: x.label })),
  ]);
}

/** مجموع أعداد تصنيف (يشمل فرعياته) من خريطة أعداد — للتجميع في بطاقات الرئيسية */
export function sumCounts(
  counts: Record<string, number> | null | undefined,
  id: string,
): number {
  if (!counts) return 0;
  return categoryIds(id).reduce((sum, cid) => sum + (counts[cid] ?? 0), 0);
}

export const DEFAULT_CATEGORY_ID = "clothes";
