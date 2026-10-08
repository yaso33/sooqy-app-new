import { useQuery } from "@tanstack/react-query";
import { fetchWilayas } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

export const wilayasQuery = { queryKey: ["wilayas"], queryFn: fetchWilayas, staleTime: Infinity };

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
      className={cn("h-10 rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring", className)}
    >
      {allLabel !== null ? <option value="">{allLabel}</option> : <option value="" disabled>اختر الولاية</option>}
      {data.map((w) => (
        <option key={w.id} value={w.id}>
          {String(w.id).padStart(2, "0")} - {w.name_ar}
        </option>
      ))}
    </select>
  );
}
