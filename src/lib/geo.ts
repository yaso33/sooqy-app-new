import { useEffect, useState } from "react";

export type LatLng = { lat: number; lng: number };

export const ALGIERS: LatLng = { lat: 36.7538, lng: 3.0588 };

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatKm(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`;
}

export function directionsUrl(lat?: number | null, lng?: number | null, label?: string) {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label ?? "")}`;
}

/** Browser geolocation; returns null until the user grants permission. */
export function useGeo() {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setDenied(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);
  return { pos, denied };
}

export type OpeningHours = { open?: string; close?: string; closed_days?: number[] };

/** Opening status evaluated in Algeria time (UTC+1). */
export function isOpenNow(h: unknown, now = new Date()): boolean {
  const oh = (h ?? {}) as OpeningHours;
  if (!oh.open || !oh.close) return false;
  const dz = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
  if (oh.closed_days?.includes(dz.getDay())) return false;
  const mins = dz.getHours() * 60 + dz.getMinutes();
  const [oH, oM] = oh.open.split(":").map(Number);
  const [cH, cM] = oh.close.split(":").map(Number);
  return mins >= (oH ?? 0) * 60 + (oM ?? 0) && mins < (cH ?? 0) * 60 + (cM ?? 0);
}

export function greeting(now = new Date()) {
  const h = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000).getHours();
  if (h < 5) return "تصبح على خير 🌙";
  if (h < 12) return "صباح الخير ☀️";
  if (h < 17) return "طاب نهارك 🌤️";
  if (h < 20) return "مساء الخير 🌇";
  return "تصبح على خير 🌙";
}

export const formatDA = (n: number) => `${n.toLocaleString("fr-DZ")} دج`;
