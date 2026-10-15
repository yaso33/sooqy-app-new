import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { profileFromFile, type VisualProfile } from "@/lib/image-search";
import { cn } from "@/lib/utils";

type Props = {
  onSearch: (profile: VisualProfile, previewUrl: string) => void;
  className?: string;
  /** نص الزر */
  label?: string;
};

/** زر البحث بالصور: يختار المستخدم صورة، نحلّلها في المتصفح
 *  ثم ننتقل إلى نتائج مرتّبة حسب التشابه البصري. */
export function ImageSearchButton({ onSearch, className, label = "ابحث بصورة" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة صالحًا");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جدًا (الحد 8 ميغا)");
      return;
    }

    setBusy(true);
    const previewUrl = URL.createObjectURL(file);
    try {
      const profile = await profileFromFile(file);
      onSearch(profile, previewUrl);
      toast.success("تم تحليل الصورة، هذه أقرب النتائج");
    } catch {
      toast.error("تعذّر تحليل الصورة، جرّب صورة أخرى");
      URL.revokeObjectURL(previewUrl);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        aria-label={label}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full border border-border bg-card text-xs font-semibold text-foreground transition active:scale-95",
          "h-9 px-3 disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4 text-primary" />}
        <span>{busy ? "جارٍ التحليل…" : label}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // على الهاتف يفتح الكاميرا مباشرة، وعلى الحاسوب يختار من الملفات
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </>
  );
}

/** شارة تعرض الصورة التي بُحث بها */
export function ImageSearchBadge({
  previewUrl,
  onClear,
}: {
  previewUrl: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pr-2">
      <img
        src={previewUrl}
        alt="الصورة المستخدمة في البحث"
        className="size-9 shrink-0 rounded-lg object-cover"
      />
      <span className="text-xs font-semibold text-foreground">نتائج بحسب صورتك</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="إزالة البحث بالصورة"
        className="mr-auto grid size-7 place-items-center rounded-full text-muted-foreground transition active:scale-90"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}