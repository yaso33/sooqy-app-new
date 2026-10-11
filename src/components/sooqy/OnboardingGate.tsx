import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { INTRO_SLIDES } from "./intro-assets";

const KEY = "sooqy:onboarded";

/**
 * شاشات الترحيب — تظهر مرة واحدة فقط (localStorage) ثم تُتخطى نهائيًا.
 * واجهة فقط، بلا أي بيانات.
 */
export function OnboardingGate() {
  // نبدأ مطابقًا للخادم (null) ثم نقرأ localStorage بعد التصاق الهيدرويشن —
  // قراءة localStorage داخل useState تسبّب فشل hydration وشاشة بيضاء في SSR
  const [done, setDone] = useState(true);
  const [index, setIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    try {
      setDone(window.localStorage.getItem(KEY) === "1");
    } catch {
      setDone(false);
    }
  }, []);

  // تأخير ظهور الزر 4 ثوانٍ عند تغيير الشريحة
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 4000);
    return () => clearTimeout(timer);
  }, [index]);

  if (done) return null;

  const slide = INTRO_SLIDES[index]!;
  const last = index === INTRO_SLIDES.length - 1;

  const finish = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* تجاهل */
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <img
          src={slide.image}
          alt=""
          className="h-full w-full object-cover"
        />
        {/* تدرّج سفلي لفصل الأزرار عن محتوى الصورة */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {showButton && (
        <div className="absolute left-0 right-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-10 safe-bottom z-10">
          <button
            onClick={last ? finish : () => setIndex(index + 1)}
            className="btn-primary max-w-sm shadow-soft rounded-2xl px-8 py-3 text-base font-medium transition-all duration-200 hover:shadow-lift active:scale-[0.98]"
          >
            {last ? "ابدأ الآن" : "التالي"}
          </button>
          <div className="flex items-center gap-2">
            {INTRO_SLIDES.map((_, i) => (
              <button
                key={i}
                aria-label={`الشريحة ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-2 bg-primary/60",
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
