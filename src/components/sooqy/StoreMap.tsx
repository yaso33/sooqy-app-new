import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { LatLng } from "@/lib/geo";
import type { Store } from "@/lib/sooqy";

const pin = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:${active ? 36 : 28}px;height:${active ? 36 : 28}px;border-radius:9999px;background:${active ? "#4F46E5" : "#6366F1"};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">🏪</div>`,
    iconSize: [active ? 36 : 28, active ? 36 : 28],
    iconAnchor: [active ? 18 : 14, active ? 18 : 14],
  });

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
}

export default function StoreMap({
  center,
  user,
  stores,
  activeId,
  onSelect,
}: {
  center: LatLng;
  user: LatLng | null;
  stores: Store[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="size-full" zoomControl={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter center={center} />
      {user && <CircleMarker center={[user.lat, user.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#10B981", fillOpacity: 1 }} />}
      {stores
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => (
          <Marker key={s.id} position={[s.latitude!, s.longitude!]} icon={pin(s.id === activeId)} eventHandlers={{ click: () => onSelect(s.id) }} />
        ))}
    </MapContainer>
  );
}
