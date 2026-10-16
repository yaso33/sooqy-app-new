import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MapPin } from "lucide-react";
import { fetchWilayas } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

export const wilayasQuery = { queryKey: ["wilayas"], queryFn: fetchWilayas, staleTime: Infinity };

/** زر مضغوط للترويسة (بحجم زر الأيقونة) يفتح منتقي الولايات عبر قائمة أصلية شفافة فوقه. */
export function WilayaButton({
  value,
  onChange,
  className,
  allLabel = "كل الولايات",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  allLabel?: string;
}) {
  const { data = [] } = useQuery(wilayasQuery);
  const current = data.find((w) => w.id === value);
  const label = value == null ? allLabel : (current?.name_ar ?? String(value).padStart(2, "0"));
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card transition focus-within:ring-2 focus-within:ring-primary/25",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex h-10 items-center gap-1.5 px-3 transition active:bg-neutral-100"
      >
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="max-w-[4.5rem] truncate text-sm font-bold text-foreground">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </span>
      <select
        value={value ?? ""}
        aria-label="اختيار الولاية"
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
      >
        <option value="">{allLabel}</option>
        {data.map((w) => (
          <option key={w.id} value={w.id}>
            {String(w.id).padStart(2, "0")} - {w.name_ar}
          </option>
        ))}
      </select>
    </div>
  );
}

export function WilayaSelect({
  value,
  onChange,
  allLabel = "كل الولايات",
  className,
  required,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  allLabel?: string | null;
  className?: string;
  required?: boolean;
}) {
  const { data = [] } = useQuery(wilayasQuery);
  return (
    <select
      value={value ?? ""}
      required={required}
      aria-label="اختيار الولاية"
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={cn(
        "h-10 rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500",
        className,
      )}
    >
      {allLabel !== null ? (
        <option value="">{allLabel}</option>
      ) : (
        <option value="" disabled>
          اختر الولاية
        </option>
      )}
      {data.map((w) => (
        <option key={w.id} value={w.id}>
          {String(w.id).padStart(2, "0")} - {w.name_ar}
        </option>
      ))}
    </select>
  );
}
