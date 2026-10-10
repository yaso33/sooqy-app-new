import type { StyleSpecification } from "maplibre-gl";

/**
 * نمط الخريطة الخاص بـ SooQy — طبقات متجهية (OpenMapTiles عبر OpenFreeMap)
 * مصمّمة يدويًا على هوية Indigo بدل بلاطات OSM النقطية القديمة.
 *
 * لماذا متجهي؟
 * - البلاطات النقطية لـ OSM تأتي بألوانها وطُرقها وعلاماتها الجاهزة (مظهر قديم لا يمكن تغييره).
 * - المتجهي يسمح بضبط كل طبقة: الخلفية، الماء، الطرق، المباني، وحتى لون وخط العناوين،
 *   إضافةً إلى عنوان بأي حجم/كثافة ونصوص عربية حقيقية.
 *
 * المصادر (تحقّق فعلي، بلا مفاتيح ولا حدود):
 * - https://tiles.openfreemap.org/planet → TileJSON، CORS=*، بلاطات pbf، z0–14 (MapLibre يكبّر فوقها).
 * - https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf → يشمل نطاق العربية (1536–1791).
 * البيانات من OpenStreetMap، والاستضافة OpenFreeMap — الإسناد مطلوب ومُفعّل عبر AttractionControl.
 */

/** ألوان الهوية المستخدمة في النمط والعلامات (مصدر واحد للحقيقة) */
export const MAP_COLORS = {
  /** الخلفية الأرضية — فاتحة بميل indigo */
  land: "#F3F5FA",
  /** أحياء سكنية */
  residential: "#EAEEF6",
  /** مساحات خضراء */
  green: "#DFF3E4",
  greenSoft: "#EAF7EE",
  /** الماء */
  water: "#C7D7F5",
  waterway: "#AFC4EE",
  /** المباني */
  building: "#E4E9F2",
  buildingEdge: "#D8DFEC",
  /** الطرق */
  road: "#FFFFFF",
  roadCasing: "#D9E1EF",
  roadCasingStrong: "#CFD9EA",
  rail: "#D5DCE8",
  /** الحدود الإدارية */
  boundary: "#B9C4E6",
  /** النصوص */
  labelCity: "#1F2937",
  labelPlace: "#445168",
  labelMinor: "#5C6B85",
  labelWater: "#6B86B8",
  halo: "#FFFFFF",
  /** هوية العلامات والعناصر التفاعلية */
  primary: "#6366F1",
  primaryDark: "#4F46E5",
  primaryDeep: "#4338CA",
  ink: "#111827",
  green_user: "#10B981",
} as const;

export const VECTOR_SOURCE_ID = "omt";
export const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];
const FONT_ITALIC = ["Noto Sans Italic"];

/** الاسم المحلي أولًا (عربي في الجزائر) ثم اللاتيني — بدل دمج اللاتيني+العربي الذي يفعله positron */
const NAME_LOCAL = ["coalesce", ["get", "name"], ["get", "name:latin"], ["get", "name:nonlatin"]];
const NAME_WITH_REF = ["coalesce", ["get", "name"], ["get", "ref"], ["get", "name:latin"]];

const POLYGON = ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false];
const LINE = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];

const layers: unknown[] = [
  { id: "bg", type: "background", paint: { "background-color": MAP_COLORS.land } },

  // ---- الأرض والمساحات ----
  {
    id: "landuse-residential",
    type: "fill",
    source: VECTOR_SOURCE_ID,
    "source-layer": "landuse",
    filter: ["all", POLYGON, ["==", ["get", "class"], "residential"]],
    paint: {
      "fill-color": MAP_COLORS.residential,
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.45, 12, 0.9],
    },
  },
  {
    id: "landcover-wood",
    type: "fill",
    source: VECTOR_SOURCE_ID,
    "source-layer": "landcover",
    minzoom: 9,
    filter: ["all", POLYGON, ["==", ["get", "class"], "wood"]],
    paint: {
      "fill-color": MAP_COLORS.green,
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0, 12, 0.85],
    },
  },
  {
    id: "landcover-grass",
    type: "fill",
    source: VECTOR_SOURCE_ID,
    "source-layer": "landcover",
    minzoom: 11,
    filter: ["all", POLYGON, ["match", ["get", "class"], ["grass", "farmland"], true, false]],
    paint: { "fill-color": MAP_COLORS.greenSoft, "fill-opacity": 0.75 },
  },
  {
    id: "park",
    type: "fill",
    source: VECTOR_SOURCE_ID,
    "source-layer": "park",
    filter: POLYGON,
    paint: { "fill-color": MAP_COLORS.green, "fill-opacity": 0.9 },
  },

  // ---- الماء ----
  {
    id: "water",
    type: "fill",
    source: VECTOR_SOURCE_ID,
    "source-layer": "water",
    filter: ["all", POLYGON, ["!=", ["get", "brunnel"], "tunnel"]],
    paint: { "fill-color": MAP_COLORS.water, "fill-antialias": true },
  },
  {
    id: "waterway",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "waterway",
    minzoom: 9,
    filter: LINE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.waterway,
      "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 9, 0.5, 14, 1.2, 20, 4],
    },
  },

  // ---- المباني (بلا زحام على التكبير المنخفض) ----
  {
    id: "building",
    type: "fill",
    source: VECTOR_SOURCE_ID,
    "source-layer": "building",
    minzoom: 13.5,
    paint: {
      "fill-color": MAP_COLORS.building,
      "fill-outline-color": MAP_COLORS.buildingEdge,
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 15, 0.9],
    },
  },

  // ---- الحدود الإدارية ----
  {
    id: "boundary-country",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "boundary",
    minzoom: 2,
    filter: ["<=", ["to-number", ["get", "admin_level"]], 4],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.boundary,
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.8, 10, 1.6],
      "line-dasharray": [3, 2],
    },
  },
  {
    id: "boundary-region",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "boundary",
    minzoom: 7,
    filter: [">=", ["to-number", ["get", "admin_level"]], 5],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.boundary,
      "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 14, 1.4],
      "line-dasharray": [2, 2],
      "line-opacity": 0.8,
    },
  },

  // ---- الطرق: مسارات ثم صغيرة ثم رئيسية (بترتيب الرسم) ----
  {
    id: "road-path",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 14,
    filter: ["all", LINE, ["==", ["get", "class"], "path"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.road,
      "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 14, 1, 20, 6],
    },
  },
  {
    id: "road-minor",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 12.5,
    filter: ["all", LINE, ["match", ["get", "class"], ["minor", "service", "track"], true, false]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.road,
      "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 12.5, 0.8, 16, 2.4, 20, 10],
    },
  },
  {
    id: "road-major-casing",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 8,
    filter: [
      "all",
      LINE,
      ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk"], true, false],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.roadCasing,
      "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 8, 1.6, 14, 5, 20, 26],
    },
  },
  {
    id: "road-major",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 8,
    filter: [
      "all",
      LINE,
      ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk"], true, false],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.road,
      "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 8, 0.8, 14, 3.6, 20, 22],
    },
  },
  {
    id: "road-motorway-casing",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 6,
    filter: ["all", LINE, ["==", ["get", "class"], "motorway"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.roadCasingStrong,
      "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 6, 2, 12, 6, 20, 32],
    },
  },
  {
    id: "road-motorway",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 6,
    filter: ["all", LINE, ["==", ["get", "class"], "motorway"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.road,
      "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 6, 1.2, 12, 4.6, 20, 28],
    },
  },
  {
    id: "rail",
    type: "line",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation",
    minzoom: 9,
    filter: ["all", LINE, ["match", ["get", "class"], ["rail", "transit"], true, false]],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.rail,
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 18, 3],
      "line-dasharray": [3, 2],
    },
  },

  // ---- أسماء الماء والطرق ----
  {
    id: "water-name",
    type: "symbol",
    source: VECTOR_SOURCE_ID,
    "source-layer": "water_name",
    minzoom: 11,
    layout: {
      "text-field": NAME_LOCAL,
      "text-font": FONT_ITALIC,
      "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 18, 15],
      "text-letter-spacing": 0.04,
      "text-max-width": 7,
      "text-padding": 4,
    },
    paint: {
      "text-color": MAP_COLORS.labelWater,
      "text-halo-color": MAP_COLORS.halo,
      "text-halo-width": 1.2,
      "text-halo-blur": 0.3,
    },
  },
  {
    id: "road-label",
    type: "symbol",
    source: VECTOR_SOURCE_ID,
    "source-layer": "transportation_name",
    minzoom: 13,
    filter: [
      "match",
      ["get", "class"],
      ["motorway", "trunk", "primary", "secondary", "tertiary"],
      true,
      false,
    ],
    layout: {
      "text-field": NAME_WITH_REF,
      "text-font": FONT,
      "symbol-placement": "line",
      "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10.5, 18, 13],
      "text-letter-spacing": 0.02,
      "text-padding": 6,
      "symbol-spacing": 320,
      "text-rotation-alignment": "map",
    },
    paint: {
      "text-color": MAP_COLORS.labelMinor,
      "text-halo-color": MAP_COLORS.halo,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.4,
    },
  },

  // ---- أسماء الأماكن: من الأحياء إلى المدن ----
  {
    id: "place-neighbourhood",
    type: "symbol",
    source: VECTOR_SOURCE_ID,
    "source-layer": "place",
    minzoom: 12,
    filter: [
      "match",
      ["get", "class"],
      ["suburb", "neighbourhood", "quarter", "hamlet"],
      true,
      false,
    ],
    layout: {
      "text-field": NAME_LOCAL,
      "text-font": FONT,
      "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11, 16, 13],
      "text-letter-spacing": 0.02,
      "text-max-width": 8,
      "text-padding": 6,
    },
    paint: {
      "text-color": MAP_COLORS.labelMinor,
      "text-halo-color": MAP_COLORS.halo,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.3,
    },
  },
  {
    id: "place-town",
    type: "symbol",
    source: VECTOR_SOURCE_ID,
    "source-layer": "place",
    minzoom: 8,
    filter: ["match", ["get", "class"], ["town", "village"], true, false],
    layout: {
      "text-field": NAME_LOCAL,
      "text-font": FONT_BOLD,
      "text-size": ["interpolate", ["linear"], ["zoom"], 8, 12, 14, 15.5],
      "text-letter-spacing": 0.02,
      "text-max-width": 8,
      "text-padding": 6,
    },
    paint: {
      "text-color": MAP_COLORS.labelPlace,
      "text-halo-color": MAP_COLORS.halo,
      "text-halo-width": 1.6,
      "text-halo-blur": 0.4,
    },
  },
  {
    id: "place-city",
    type: "symbol",
    source: VECTOR_SOURCE_ID,
    "source-layer": "place",
    minzoom: 4,
    filter: ["==", ["get", "class"], "city"],
    layout: {
      "text-field": NAME_LOCAL,
      "text-font": FONT_BOLD,
      "text-size": ["interpolate", ["linear"], ["zoom"], 4, 12, 9, 17, 14, 21],
      "text-letter-spacing": 0.01,
      "text-max-width": 9,
      "text-padding": 8,
    },
    paint: {
      "text-color": MAP_COLORS.labelCity,
      "text-halo-color": MAP_COLORS.halo,
      "text-halo-width": 1.8,
      "text-halo-blur": 0.5,
    },
  },
];

/**
 * النمط المتجهي النهائي — يُبنى كبنية بيانات ثم يُصرَّح كنوع MapLibre
 * (تعبيرات MapLibre أوسع من أنواع TS المفردة، والتحقق يجري عبر tsc للمكوّن).
 */
export const SOOQY_VECTOR_STYLE = {
  version: 8,
  name: "SooQy",
  glyphs: GLYPHS_URL,
  sources: {
    [VECTOR_SOURCE_ID]: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution:
        '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers,
} as unknown as StyleSpecification;

/**
 * نمط احتياطي نقطي (OSM) — يُستخدم تلقائيًا فقط إذا فشل مصدر البلاطات المتجهية
 * (حجب شبكة/سيرفر)، حتى لا تبقى الخريطة فارغة على جهاز المستخدم.
 */
export const OSM_RASTER_FALLBACK = {
  version: 8,
  name: "SooQy-fallback",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": MAP_COLORS.land } },
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.9,
        "raster-saturation": -0.35,
        "raster-contrast": -0.06,
      },
    },
  ],
} as unknown as StyleSpecification;
