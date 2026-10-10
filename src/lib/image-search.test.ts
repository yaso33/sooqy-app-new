import { describe, expect, it } from "vitest";
import { profileFromPixels, visualMatch } from "./image-search";

/** يبني مصفوفة بكسلات بلون واحد */
function solid(r: number, g: number, b: number, a = 255, size = 8) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return data;
}

describe("profileFromPixels", () => {
  it("يستخرج اللون الغالب", () => {
    const p = profileFromPixels(solid(255, 0, 0), 8, 8);
    expect(p.dominant.startsWith("#")).toBe(true);
    expect(p.colors.length).toBeGreaterThan(0);
  });

  it("يكتشف الخلفية البيضاء", () => {
    const white = profileFromPixels(solid(255, 255, 255), 8, 8);
    expect(white.whiteness).toBeGreaterThan(0.8);
    const black = profileFromPixels(solid(0, 0, 0), 8, 8);
    expect(black.whiteness).toBeLessThan(0.1);
  });

  it("يكتشف الشفافية (الشعارات والأيقونات)", () => {
    const p = profileFromPixels(solid(255, 0, 0, 0), 8, 8);
    expect(p.transparency).toBe(1);
  });

  it("يتعامل مع الصورة الفارغة دون انهيار", () => {
    const p = profileFromPixels(new Uint8ClampedArray(0), 0, 0);
    expect(p.dominant).toBeTruthy();
  });
});

describe("visualMatch", () => {
  const red = profileFromPixels(solid(220, 30, 30), 8, 8);
  const blue = profileFromPixels(solid(30, 30, 220), 8, 8);

  it("يعطي تشابهًا أعلى لنفس اللون", () => {
    const same = visualMatch(red, profileFromPixels(solid(215, 35, 30), 8, 8));
    const diff = visualMatch(red, blue);
    expect(same.score).toBeGreaterThan(diff.score);
    expect(same.score).toBeGreaterThan(0.7);
  });

  it("يشرح سبب المطابقة بالعربية", () => {
    const m = visualMatch(red, profileFromPixels(solid(220, 30, 30), 8, 8));
    expect(m.reasons.length).toBeGreaterThan(0);
    expect(m.reasons.join(" ")).toMatch(/[؀-ۿ]/);
  });

  it("يبقي النتيجة ضمن 0..1", () => {
    for (const p of [red, blue]) {
      const m = visualMatch(p, profileFromPixels(solid(0, 255, 0, 128), 4, 4));
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
    }
  });

  it("يفضّل الشفافية المتشابهة", () => {
    const transparentLogo = profileFromPixels(solid(10, 200, 10, 0), 8, 8);
    const opaque = profileFromPixels(solid(10, 200, 10), 8, 8);
    expect(visualMatch(transparentLogo, transparentLogo).score).toBeGreaterThan(
      visualMatch(transparentLogo, opaque).score,
    );
  });
});