import { describe, expect, it } from "vitest";
import { categoryLabel, primaryImage, stockLevel } from "./sooqy";
import type { ProductImage } from "./sooqy";

describe("stockLevel", () => {
  it("غير متوفر عند الإيقاف أو الصفر", () => {
    expect(stockLevel({ is_available: false, stock_quantity: 5 })).toBe("out");
    expect(stockLevel({ is_available: true, stock_quantity: 0 })).toBe("out");
  });
  it("منخفض عند 3 أو أقل", () => {
    expect(stockLevel({ is_available: true, stock_quantity: 3 })).toBe("low");
    expect(stockLevel({ is_available: true, stock_quantity: 1 })).toBe("low");
  });
  it("متوفر عند أكثر من 3", () => {
    expect(stockLevel({ is_available: true, stock_quantity: 4 })).toBe("in");
  });
});

describe("primaryImage", () => {
  const images = [
    { id: "1", offer_id: "o", image_url: "a.jpg", is_primary: false, sort_order: 1 },
    { id: "2", offer_id: "o", image_url: "b.jpg", is_primary: true, sort_order: 2 },
  ] as ProductImage[];

  it("يفضّل الصورة الأساسية", () => {
    expect(primaryImage(images)).toBe("b.jpg");
  });
  it("يعيد null بدون صور", () => {
    expect(primaryImage(undefined)).toBeNull();
    expect(primaryImage([])).toBeNull();
  });
});

describe("categoryLabel", () => {
  it("يعيد التسمية العربية للفئة المعروفة", () => {
    expect(categoryLabel("shoes")).toBeTruthy();
  });
  it("يعيد المعرّف نفسه للفئة المجهولة", () => {
    expect(categoryLabel("unknown-cat")).toBe("unknown-cat");
  });
});