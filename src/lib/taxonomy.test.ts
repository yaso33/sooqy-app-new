import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  MAIN_CATEGORIES,
  OTHER_CATEGORIES,
  categoryById,
  categoryHint,
  categoryIds,
  categoryLabel,
  categoryOptionGroups,
  categoryEmoji,
  childrenOf,
  isMainCategory,
  parentOf,
  pathLabel,
  pathOf,
  resolveCategoryId,
} from "./taxonomy";

describe("taxonomy — تماسك الشجرة", () => {
  it("عشر تصنيفات رئيسية بترتيب ثابت", () => {
    expect(MAIN_CATEGORIES.map((c) => c.id)).toEqual([
      "fashion",
      "electronics",
      "beauty",
      "home",
      "kids",
      "sports",
      "food",
      "gifts-crafts",
      "digital",
      "cars",
    ]);
  });

  it("التصنيفات الأخرى تشمل سلة «منتجات أخرى»", () => {
    expect(OTHER_CATEGORIES.map((c) => c.id)).toContain("misc");
    expect(OTHER_CATEGORIES.every((c) => !c.children)).toBe(true);
  });

  it("كل المعرّفات فريدة وغير فارغة", () => {
    const all = ALL_CATEGORIES.flatMap((c) => [c.id, ...(c.children ?? []).map((x) => x.id)]);
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it("كل تصنيف له تسمية وإيموجي ووصف الرئيسيات غير فارغ", () => {
    for (const id of ALL_CATEGORIES.flatMap((c) => [
      c.id,
      ...(c.children ?? []).map((x) => x.id),
    ])) {
      expect(categoryLabel(id), id).toBeTruthy();
      expect(categoryEmoji(id), id).toBeTruthy();
    }
    for (const main of MAIN_CATEGORIES) expect(main.hint, main.id).toBeTruthy();
  });

  it("كل تصنيف فرعي يعرف أباه الرئيسي", () => {
    for (const main of MAIN_CATEGORIES) {
      for (const child of main.children ?? []) {
        expect(parentOf(child.id)?.id, child.id).toBe(main.id);
        expect(isMainCategory(child.id)).toBe(false);
      }
      expect(isMainCategory(main.id)).toBe(true);
    }
  });
});

describe("taxonomy — الفلترة والتوافق الرجعي", () => {
  it("categoryIds للتصنيف الرئيسي يشمل فرعياته", () => {
    expect(categoryIds("fashion")).toEqual(
      expect.arrayContaining(["fashion", "clothes", "shoes", "bags"]),
    );
  });

  it("categoryIds للتصنيف الفرعي يشمل نفسه وأباه غير مطلوب", () => {
    expect(categoryIds("shoes")).toContain("shoes");
    expect(categoryIds("shoes")).not.toContain("fashion");
  });

  it("المعرّفات القديمة تُترجم وتُضمّ في الفلترة", () => {
    expect(resolveCategoryId("cosmetics")).toBe("makeup");
    expect(resolveCategoryId("capsules")).toBe("groceries");
    expect(resolveCategoryId("other")).toBe("misc");
    expect(categoryIds("beauty")).toContain("cosmetics");
    expect(categoryIds("food")).toContain("capsules");
    expect(categoryIds("misc")).toContain("other");
  });

  it("معرّف مجهول يعود كما هو ولا يكسر العرض", () => {
    expect(categoryLabel("unknown-cat")).toBe("unknown-cat");
    expect(categoryEmoji("unknown-cat")).toBe("🛍️");
    expect(categoryHint("unknown-cat")).toBe("");
    expect(categoryById("unknown-cat")).toBeUndefined();
    expect(categoryIds("unknown-cat")).toEqual(["unknown-cat"]);
    expect(categoryIds(null)).toEqual([]);
  });

  it("categoryIds لا يكرّر المعرّفات", () => {
    const ids = categoryIds("electronics");
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("taxonomy — المسار والمنتقيات", () => {
  it("pathOf يرجع الرئيسي ثم الفرعي", () => {
    expect(pathOf("shoes").map((n) => n.id)).toEqual(["fashion", "shoes"]);
    expect(pathLabel("shoes")).toBe("الأزياء والملابس ← الأحذية");
    expect(pathOf("fashion").map((n) => n.id)).toEqual(["fashion"]);
    expect(pathOf("unknown").length).toBe(0);
  });

  it("childrenOf يرجع الفرعيات فقط", () => {
    expect(childrenOf("home").length).toBe(4);
    expect(childrenOf("books").length).toBe(0);
  });

  it("مجموعات المنتقيات تغطي الشجرة كاملة + تصنيفات أخرى", () => {
    const groups = categoryOptionGroups();
    expect(groups.length).toBe(MAIN_CATEGORIES.length + 1);
    expect(groups.at(-1)!.label).toBe("تصنيفات أخرى");
    const values = groups.flatMap((g) => g.options.map((o) => o.value));
    expect(values).toContain("shoes");
    expect(values).toContain("car-parts");
    expect(values).toContain("misc");
  });
});
