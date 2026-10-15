import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  buildSuggestions,
  clearRecentSearches,
  correctTerm,
  editDistance,
  getRecentSearches,
  normalizeText,
} from "./search";

describe("normalizeText", () => {
  it("يوحّد الهمزات والتاء المربوطة والألف المقصورة", () => {
    expect(normalizeText("أحذية")).toBe(normalizeText("احذيه"));
    expect(normalizeText("عطور")).toBe(normalizeText("عطور"));
    expect(normalizeText("مكياج")).toBe(normalizeText("مكياج"));
  });

  it("يحذف التشكيل والعلامات ويخفض حالة الأحرف", () => {
    expect(normalizeText("قَهْوَة")).toBe("قهوه");
    expect(normalizeText("  Sass  ")).toBe("sass");
  });

  it("يحوّل الأرقام العربية-الهندية", () => {
    expect(normalizeText("٠٩٩")).toBe("099");
  });
});

describe("editDistance", () => {
  it("يعدّ الفروق الحرفية", () => {
    expect(editDistance("هاتف", "هاتف")).toBe(0);
    expect(editDistance("قهوة", "قهة")).toBe(1);
    expect(editDistance("قهوة", "قطعة")).toBe(2);
  });
});

describe("correctTerm", () => {
  const candidates = ["أحذية", "هواتف", "ملابس", "قهوة"];

  it("يعيد null إن كانت الكلمة غير قريبة", () => {
    expect(correctTerm("سيب", candidates)).toBeNull();
  });
});

describe("البحثات الأخيرة", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearRecentSearches();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("يحفظ ويجلب بترتيب من الأحدث", () => {
    addRecentSearch("هاتف");
    addRecentSearch("قهوة");
    expect(getRecentSearches()).toEqual(["قهوة", "هاتف"]);
  });

  it("لا يكرر الكلمة نفسها وينقلها إلى الأعلى", () => {
    addRecentSearch("هاتف");
    addRecentSearch("قهوة");
    addRecentSearch("هاتف");
    expect(getRecentSearches()).toEqual(["هاتف", "قهوة"]);
  });

  it("يتجاهل الكلمات القصيرة جدًا", () => {
    addRecentSearch("س");
    expect(getRecentSearches()).toEqual([]);
  });
});

describe("buildSuggestions", () => {
  const data = {
    products: [{ id: "p1", name: "سماعات لاسلكية", minPrice: 4500 }],
    stores: [{ id: "s1", name: "متجر الأمانة", commune: "باب الوادي" }],
    categories: [{ id: "phones", label: "هواتف" }],
  };

  it("يجمع المنتجات والمتاجر والتصنيفات المطابقة", () => {
    const out = buildSuggestions("موبا", data);
    expect(out.map((s) => s.kind)).toContain("category");
  });

  it("يطابق المتجر بالبلدية", () => {
    const out = buildSuggestions("باب الوادي", data);
    expect(out[0]).toMatchObject({ kind: "store", to: "/stores/s1" });
  });

  it("يبني رابط المنتج بشكل صحيح", () => {
    const out = buildSuggestions("سماعات", data);
    expect(out[0]).toMatchObject({ kind: "product", to: "/products/p1" });
  });

  it("يتجاهل الحقل الفارغ", () => {
    expect(buildSuggestions("   ", data)).toEqual([]);
  });
});