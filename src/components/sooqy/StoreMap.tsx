import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { MAP_COLORS, OSM_RASTER_FALLBACK, SOOQY_VECTOR_STYLE, VECTOR_SOURCE_ID } from "./map-style";
import type { LatLng } from "@/lib/geo";
import type { Store } from "@/lib/sooqy";

const C = MAP_COLORS;

const STORE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:58%;height:58%"><path d="M3.6 9.6 5.2 7h13.6l1.6 2.6"/><path d="M4.4 9.6h15.2"/><path d="M6 9.6V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.6"/><path d="M10 20v-4.4h4V20"/></svg>';

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function gpuInfo(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "لا يوجد WebGL2";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "غير معروف";
    return renderer;
  } catch {
    return "تعذّر القراءة";
  }
}

const DEBUG = (() => {
  if (import.meta.env.DEV) return true;
  try {
    if (typeof window === "undefined") return false;
    if (/[?&]mapdebug/.test(window.location.search)) return true;
    return window.localStorage.getItem("sooqy:mapdebug") === "1";
  } catch {
    return false;
  }
})();

function dbg(...args: unknown[]) {
  if (DEBUG) console.log("[StoreMap]", ...args);
}

function createMarkerElement(): HTMLElement {
  const root = document.createElement("div");
  root.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;";

  const pill = document.createElement("div");
  pill.className = "sooqy-pin-pill";
  pill.style.cssText = [
    "max-width:150px",
    "padding:4px 10px",
    "border-radius:9999px",
    "background:rgba(255,255,255,.97)",
    "border:1px solid #E2E8F0",
    "color:" + C.ink,
    "font-size:11.5px",
    "font-weight:700",
    "line-height:1.3",
    "white-space:nowrap",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "box-shadow:0 6px 18px rgba(15,23,42,.16)",
    "opacity:0",
    "transform:translateY(4px) scale(.94)",
    "transition:opacity .18s ease, transform .18s ease",
    "pointer-events:none",
  ].join(";");

  const pin = document.createElement("div");
  pin.className = "sooqy-pin-dot";
  pin.style.cssText =
    "display:flex;align-items:center;justify-content:center;border-radius:9999px;border-style:solid;border-color:#fff;color:#fff;transition:transform .18s ease, box-shadow .18s ease, border-width .18s ease;";

  root.append(pill, pin);
  return root;
}

function applyMarkerStyle(el: HTMLElement, active: boolean, label = ""): HTMLElement {
  const pill = el.querySelector(".sooqy-pin-pill") as HTMLElement | null;
  const pin = el.querySelector(".sooqy-pin-dot") as HTMLElement | null;
  if (!pill || !pin) return el;

  if (!pin.dataset["icon"]) {
    pin.innerHTML = STORE_ICON;
    pin.dataset["icon"] = "1";
  }

  if (label && pill.textContent !== label) pill.textContent = label;
  pill.style.opacity = active ? "1" : "0";
  pill.style.transform = active ? "translateY(0) scale(1)" : "translateY(4px) scale(.94)";
  pill.style.pointerEvents = active ? "auto" : "none";

  const size = active ? 36 : 28;
  const border = active ? 4 : 3;
  const shadow = active
    ? "0 10px 30px rgba(99,102,241,.35), 0 0 0 6px rgba(99,102,241,.14)"
    : "0 6px 18px rgba(15,23,42,.16)";
  pin.style.width = size + "px";
  pin.style.height = size + "px";
  pin.style.borderWidth = border + "px";
  pin.style.boxShadow = shadow;
  pin.style.background = active ? C.primaryDeep : `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`;
  pin.style.transform = active ? "scale(1.08)" : "scale(1)";

  return el;
}

export default function StoreMap({
  center,
  user,
  stores = [],
  activeId,
  onSelect,
}: {
  center: LatLng;
  user?: LatLng | null;
  stores?: Store[];
  activeId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tilesWarn, setTilesWarn] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    maplibregl.setWorkerUrl(maplibreglWorkerUrl);
    if (DEBUG) dbg("عنوان الـ worker:", maplibreglWorkerUrl);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setContainerSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
        if (mapRef.current && cr.width > 0 && cr.height > 0) {
          requestAnimationFrame(() => mapRef.current?.resize());
        }
      }
    });
    ro.observe(el);
    const cr = el.getBoundingClientRect();
    setContainerSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!hasWebGL2()) {
      setError("متصفحك لا يدعم WebGL2 — لا يمكن عرض الخريطة.");
      return;
    }
    if (el.clientWidth === 0 || el.clientHeight === 0) {
      dbg("تحذير: الحاوية بلا مقاس فعلي — الخريطة لن تظهر مهما كان الإعداد صحيحًا");
    }
    dbg("مقاس الحاوية:", el.clientWidth, "×", el.clientHeight);
    dbg("WebGL2:", hasWebGL2(), "· كرت الرسوميات:", gpuInfo());
    dbg("سياق آمن:", window.isSecureContext, "· متصل:", navigator.onLine);

    // إجبار العنصر على العرض الكامل (قد يكون محصوراً بـ Suspense/ClientOnly)
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.minWidth = "100%";
    el.style.minHeight = "100%";

    const map = new maplibregl.Map({
      container: el,
      style: SOOQY_VECTOR_STYLE as maplibregl.StyleSpecification,
      center: [center.lng, center.lat] as [number, number],
      zoom: 13,
      attributionControl: { compact: true },
      dragRotate: false,
      touchPitch: false,
      pitch: 0,
      maxZoom: 19,
      minZoom: 9,
      maxCanvasSize: [4096, 4096],
    });

    mapRef.current = map;

    // إجبار تغيير الحجم بعد إنشاء الخريطة (الحاوية قد تكون 1px أثناء Suspense)
    requestAnimationFrame(() => map.resize());

    map.on("style.load", () => {
      dbg("حدث style.load — النمط المتجهي حُمّل");
      setUsedFallback(false);
      setTilesWarn(false);
      setMapReady(true);
      requestAnimationFrame(() => map.resize());
    });

    map.on("error", (e) => {
      const err = (e as unknown as { error?: { message?: string; url?: string; status?: number } }).error;
      const msg = err?.message ?? String(e);
      const url = err?.url ?? "";
      console.error("[StoreMap] خطأ في الخريطة:", msg, url);
      if (usedFallback) return;
      if (url.includes("openfreemap.org/planet") || msg.includes("source") || msg.includes("tile") || msg.includes("Style")) {
        console.warn("[StoreMap] فشل تحميل البلاطات المتجهية — التحويل للنمط الاحتياطي (OSM نقطي)");
        try {
          map.setStyle(OSM_RASTER_FALLBACK as maplibregl.StyleSpecification);
          setUsedFallback(true);
          setTilesWarn(true);
        } catch (err2) {
          console.error("[StoreMap] فشل التحويل للـ fallback:", err2);
          setError("تعذّر عرض الخريطة بسبب مشكلة في مصدر البلاطات.");
        }
      }
    });

    map.on("load", () => {
      dbg("حدث load — الخريطة جاهزة");
      setMapReady(true);
      setTimeout(() => {
        try {
          if (!map.areTilesLoaded()) {
            setTilesWarn(true);
            dbg("tiles: لم تصل بلاطات بعد (areTilesLoaded=false)");
          } else {
            dbg("tiles: وصلت أول بلاطة بنجاح ✔");
          }
        } catch {
          /* ignore */
        }
      }, 7000);
    });

    map.on("idle", () => {
      const cw = Math.round(map.getCanvas().width);
      const ch = Math.round(map.getCanvas().height);
      dbg("حدث idle · canvas:", cw, "×", ch, "· loaded:", map.areTilesLoaded());
      if (cw < 100) {
        // العرض صغير جداً — إجبار resize
        requestAnimationFrame(() => map.resize());
      }
    });

    // مراقبة تغيير مقاس الحاوية فعلياً (ResizeObserver إضافي للخريطة نفسها)
    const roMap = new ResizeObserver(() => {
      if (mapRef.current) {
        const cw = mapRef.current.getCanvas().width;
        if (cw < 100) {
          requestAnimationFrame(() => mapRef.current!.resize());
        }
      }
    });
    roMap.observe(el);

    // فحص دوري احتياطي: إذا بقي العرض صغيراً بعد تحميل النمط، نعيد المحاولة
    const checkInterval = setInterval(() => {
      if (mapRef.current && mapRef.current.getCanvas().width < 100) {
        mapRef.current.resize();
      } else {
        clearInterval(checkInterval);
      }
    }, 500);
    setTimeout(() => clearInterval(checkInterval), 10000);

    map.on("data", (e) => {
      if (e.dataType === "source" && e.sourceId === VECTOR_SOURCE_ID && e.isSourceLoaded) {
        dbg("وصلت بيانات البلاطات المتجهية ✔");
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      roMap.disconnect();
      clearInterval(checkInterval);
    };
  }, [center.lat, center.lng, attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter([center.lng, center.lat]);
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const seen = new Set<string>();
    stores.forEach((store) => {
      const s = store as Store & { latitude?: number | null; longitude?: number | null };
      const id = String(store.id);
      if (typeof s.latitude !== "number" || typeof s.longitude !== "number") return;
      seen.add(id);
      let marker = markersRef.current.get(id);
      if (!marker) {
        const el = createMarkerElement();
        marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.longitude, s.latitude]);
        el.addEventListener("click", () => onSelect?.(id));
        marker.addTo(map);
        markersRef.current.set(id, marker);
      } else {
        marker.setLngLat([s.longitude, s.latitude]);
      }
      applyMarkerStyle((marker.getElement() as HTMLElement), activeId === id, String(store.name ?? ""));
    });
    markersRef.current.forEach((m, id) => {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });
  }, [stores, activeId, mapReady, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (!user) return;
    const el = document.createElement("div");
    el.style.cssText =
      "width:14px;height:14px;border-radius:9999px;background:" +
      C.green_user +
      ";border:2px solid #fff;box-shadow:0 0 0 4px rgba(16,185,129,.25),0 6px 16px rgba(16,185,129,.35);animation:sooqy-pulse 1.8s ease-in-out infinite;";
    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([user.lng, user.lat]).addTo(map);
  }, [user, mapReady]);

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 280 });
  };

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: 14, duration: 600 });
  };

  if (error) {
    return (
      <div className="relative size-full flex flex-col items-center justify-center gap-3 text-center px-4 bg-[#F8FAFC]">
        <div className="text-base font-bold text-[#111827]">{error}</div>
        <div className="text-xs text-[#64748B]">كرت الرسوميات: {gpuInfo()}</div>
        <button
          onClick={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#6366F1] px-4 py-2 text-sm font-bold text-white shadow-soft"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="relative size-full" style={{ width: "100%", height: "100%" }}>
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
      {DEBUG && containerSize.w === 0 && containerSize.h === 0 && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 shadow-soft">
          الحاوية 0×0 — تحقق من ارتفاع المسار (bottom-16 + calc(100vh-4rem))
        </div>
      )}
      {tilesWarn && !usedFallback && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#334155] shadow-soft ring-1 ring-[#E2E8F0]">
          لم تصل بلاطات الخريطة بعد — قد يستغرق بضع ثوانٍ أو يظهر عند تحريك الخريطة
        </div>
      )}
      {usedFallback && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-soft ring-1 ring-amber-200">
          تم التحويل لنمط OSM احتياطيًا (بلاطات متجهية غير متاحة مؤقتًا)
        </div>
      )}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => zoomBy(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#111827] shadow-soft ring-1 ring-[#E2E8F0] transition hover:bg-white active:scale-95"
          aria-label="تكبير"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => zoomBy(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#111827] shadow-soft ring-1 ring-[#E2E8F0] transition hover:bg-white active:scale-95"
          aria-label="تصغير"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button
          onClick={recenter}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#111827] shadow-soft ring-1 ring-[#E2E8F0] transition hover:bg-white active:scale-95"
          aria-label="العودة لمركز الخريطة"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
      <style>{`
        @keyframes sooqy-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,.45), 0 6px 16px rgba(16,185,129,.35); }
          70% { box-shadow: 0 0 0 10px rgba(16,185,129,0), 0 6px 16px rgba(16,185,129,.35); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0), 0 6px 16px rgba(16,185,129,.35); }
        }
      `}</style>
    </div>
  );
}
