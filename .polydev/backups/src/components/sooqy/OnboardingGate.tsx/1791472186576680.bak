import { useState } from "react";
import { MapPin, ShoppingBag, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const slides = [
  {
    icon: MapPin,
    title: "اكتشف المتاجر من حولك",
    text: "اعثر على أقرب المتاجر في مدينتك واطّلع على منتجاتها مباشرة على الخريطة.",
  },
  {
    icon: ShoppingBag,
    title: "تصفح المنتجات بسهولة",
    text: "قارن الأسعار بين المتاجر المجاورة واختر الأفضل لك بلمسة واحدة.",
  },
  {
    icon: Smartphone,
    title: "تسوق من هاتفك",
    text: "اطلب، احجز، وتابع طلباتك حتى باب منزلك مباشرة من التطبيق.",
  },
] as const;

const KEY = "sooqy:onboarded";

/**
 * شاشات الترحيب — تظهر مرة واحدة فقط (localStorage) ثم تُتخطى نهائيًا.
 * واجهة فقط، بلا أي بيانات.
 */
export function OnboardingGate() {
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState(0);

  if (done) return null;

  const slide = slides[index]!;
  const last = index === slides.length - 1;

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
      <div className="flex items-center justify-between px-6 pt-6 safe-top">
        <span className="text-lg font-extrabold text-foreground">SooQy</span>
        <button
          onClick={finish}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors active:bg-neutral-100"
        >
          تخطي
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div key={index} className="flex size-36 items-center justify-center rounded-[2rem] bg-primary-soft animate-scale-in">
          <slide.icon className="size-16 text-primary" strokeWidth={1.6} />
        </div>
        <h1 className="mt-8 text-h1 text-foreground animate-fade-up">{slide.title}</h1>
        <p className="mt-3 max-w-xs text-body text-muted-foreground animate-fade-up delay-100">{slide.text}</p>
      </div>

      <div className="flex flex-col items-center gap-5 px-6 pb-10 safe-bottom">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`الشريحة ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-2 bg-neutral-300",
              )}
            />
          ))}
        </div>
        <button onClick={last ? finish : () => setIndex(index + 1)} className="btn-primary w-full max-w-sm">
          {last ? "ابدأ الآن" : "التالي"}
        </button>
      </div>
    </div>
  );
}