import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Store as StoreIcon } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { fetchNearStores } from "@/lib/sooqy";
import { StoreCard } from "@/components/sooqy/cards";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { ListSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: "المحلات — SOOQY" },
      { name: "description", content: "جميع المحلات المسجلة في SOOQY، مرتبة حسب القرب والمفتوحة الآن." },
      { property: "og:title", content: "محلات SOOQY في 58 ولاية" },
      { property: "og:description", content: "اكتشف المتاجر الرقمية للمحلات الجزائرية." },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  const { pos } = useGeo();
  const [w, setW] = useState<number | null>(null);
  const stores = useQuery({
    queryKey: ["near-stores", w, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(w, pos?.lat, pos?.lng),
  });
  return (
    <div className="space-y-4 px-4 pt-5">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="المحلات" subtitle="اكتشف المحلات القريبة منك" className="min-w-0" />
        <WilayaSelect value={w} onChange={setW} className="h-9 shrink-0 text-xs" />
      </div>
      {stores.isLoading && <ListSkeleton count={4} />}
      <div className="space-y-3">
        {stores.data?.map((s) => (
          <StoreCard key={s.id} s={s} distance={s.distance} />
        ))}
      </div>
      {!stores.isLoading && stores.data?.length === 0 && (
        <EmptyState
          icon="🏪"
          title="لا توجد محلات في هذه الولاية بعد"
          hint="جرّب ولاية أخرى أو عد لاحقًا."
        />
      )}
      {!stores.isLoading && (stores.data?.length ?? 0) > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <StoreIcon className="size-3.5" /> {stores.data?.length} محل في القائمة
        </p>
      )}
    </div>
  );
}