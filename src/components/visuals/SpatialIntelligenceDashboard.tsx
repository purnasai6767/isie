"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ColumnLayer, PathLayer, PolygonLayer } from "@deck.gl/layers";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { FlyToInterpolator, type MapViewState } from "@deck.gl/core";
import MapboxMap, { type MapRef } from "react-map-gl/mapbox";
import { latLngToCell } from "h3-js";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  CloudRain,
  Crosshair,
  Layers3,
  LocateFixed,
  Radio,
  Route,
  Satellite,
  ShieldAlert,
  Waves,
} from "lucide-react";

type Region = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  zoom: number;
  hazard: string;
};

type Hazard = {
  position: [number, number];
  height: number;
  severity: number;
};

type CapacityCell = {
  hex: string;
  elevation: number;
  severity: number;
};

type RouteFeature = {
  name: string;
  path: [number, number][];
};

const REGIONS: Region[] = [
  {
    id: "uttarakhand",
    name: "Uttarakhand · Chamoli",
    latitude: 30.402,
    longitude: 79.32,
    zoom: 10.4,
    hazard: "Riverine flood / landslide",
  },
  {
    id: "assam",
    name: "Assam · Guwahati",
    latitude: 26.18,
    longitude: 91.73,
    zoom: 10.5,
    hazard: "Riverine flood",
  },
  {
    id: "kerala",
    name: "Kerala · Wayanad",
    latitude: 11.61,
    longitude: 76.13,
    zoom: 10.3,
    hazard: "Heavy rainfall / landslide",
  },
];

const MODULES = [
  { id: "hazard", label: "01", name: "Hazard Zones", layer: "hazards" },
  { id: "capacity", label: "02", name: "Carrying Capacity", layer: "capacity" },
  { id: "relocation", label: "03", name: "Relocation Index", layer: "routes" },
] as const;

const INITIAL_LAYERS = {
  sar: false,
  hazards: true,
  capacity: true,
  routes: true,
};

const DEMO_ROUTES: RouteFeature[] = [
  { name: "NORTH RELIEF CORRIDOR", path: [[-0.035, 0.035], [0.005, 0.018], [0.048, 0.028]] },
  { name: "RIVER CROSSING · CHECK", path: [[-0.03, -0.034], [0.005, -0.012], [0.04, 0.004]] },
];

function makeHazards(region: Region): Hazard[] {
  return [
    { position: [region.longitude - 0.02, region.latitude + 0.012], height: 1150, severity: 0.95 },
    { position: [region.longitude + 0.013, region.latitude + 0.006], height: 880, severity: 0.78 },
    { position: [region.longitude - 0.005, region.latitude - 0.018], height: 640, severity: 0.64 },
    { position: [region.longitude + 0.026, region.latitude - 0.012], height: 420, severity: 0.48 },
  ];
}

function makeCapacityCells(region: Region): CapacityCell[] {
  const cells = new Map<string, CapacityCell>();
  Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, column) => {
      const latitude = region.latitude + (row - 2) * 0.012;
      const longitude = region.longitude + (column - 2) * 0.014;
      const severity = Math.min(1, 0.22 + Math.abs(row - 2) * 0.13 + Math.abs(column - 2) * 0.09);
      const hex = latLngToCell(latitude, longitude, 6);
      cells.set(hex, {
        hex,
        elevation: 90 + Math.round(severity * 390),
        severity,
      });
    })
  );
  return Array.from(cells.values());
}

function Metric({
  label,
  value,
  unit,
  level,
  progress,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  level: "critical" | "warning" | "safe";
  progress: number;
  icon: typeof ShieldAlert;
}) {
  const colors = {
    critical: "text-rose-300 bg-rose-400",
    warning: "text-amber-300 bg-amber-400",
    safe: "text-emerald-300 bg-emerald-400",
  };

  return (
    <div className="rounded border border-white/[0.08] bg-[#0a111b]/90 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-tight text-slate-100">
            {value}
            {unit && <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>}
          </p>
        </div>
        <Icon className={`mt-0.5 h-4 w-4 ${colors[level].split(" ")[0]}`} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded bg-white/[0.07]">
          <div className={`h-full ${colors[level].split(" ")[1]}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-wider ${colors[level].split(" ")[0]}`}>
          {level}
        </span>
      </div>
    </div>
  );
}

export default function SpatialIntelligenceDashboard() {
  const [regionId, setRegionId] = useState(REGIONS[0].id);
  const [module, setModule] = useState<(typeof MODULES)[number]["id"]>("hazard");
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [frame, setFrame] = useState(68);
  const [clock, setClock] = useState("--:--:--");
  const [scenario, setScenario] = useState("BASELINE");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: REGIONS[0].longitude,
    latitude: REGIONS[0].latitude,
    zoom: REGIONS[0].zoom,
    pitch: 57,
    bearing: -16,
  });
  const mapRef = useRef<MapRef>(null);
  const token = MAPBOX_ACCESS_TOKEN;
  const region = REGIONS.find((item) => item.id === regionId) ?? REGIONS[0];

  useEffect(() => {
    const updateClock = () =>
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date())
      );
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || map.getSource("isie-terrain-dem")) return;

    map.addSource("isie-terrain-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
    map.setTerrain({ source: "isie-terrain-dem", exaggeration: 1.2 });
  }, []);

  const changeRegion = (id: string) => {
    const next = REGIONS.find((item) => item.id === id);
    if (!next) return;
    setRegionId(id);
    setViewState((current) => ({
      ...current,
      longitude: next.longitude,
      latitude: next.latitude,
      zoom: next.zoom,
      pitch: 57,
      bearing: -16,
      transitionDuration: 1350,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.15 }),
    }));
  };

  const toggleLayer = (id: keyof typeof INITIAL_LAYERS) =>
    setLayers((current) => ({ ...current, [id]: !current[id] }));

  const hazards = useMemo(() => makeHazards(region), [region]);
  const capacityCells = useMemo(() => makeCapacityCells(region), [region]);
  const routes = useMemo<RouteFeature[]>(
    () =>
      DEMO_ROUTES.map((route) => ({
        ...route,
        path: route.path.map(
          ([dx, dy]) => [region.longitude + dx, region.latitude + dy] as [number, number]
        ),
      })),
    [region]
  );

  const deckLayers = useMemo(
    () => [
      ...(layers.sar
        ? [
            new PolygonLayer({
              id: "simulated-sar-scene",
              data: [
                {
                  polygon: [
                    [region.longitude - 0.085, region.latitude - 0.055],
                    [region.longitude + 0.075, region.latitude - 0.015],
                    [region.longitude + 0.085, region.latitude + 0.055],
                    [region.longitude - 0.075, region.latitude + 0.015],
                  ],
                },
              ],
              getPolygon: (item: { polygon: [number, number][] }) => item.polygon,
              getFillColor: [251, 191, 36, 25],
              getLineColor: [251, 191, 36, 135],
              lineWidthMinPixels: 1,
              stroked: true,
              filled: true,
            }),
          ]
        : []),
      ...(layers.capacity
        ? [
            new H3HexagonLayer<CapacityCell>({
              id: "carrying-capacity-h3",
              data: capacityCells,
              getHexagon: (item) => item.hex,
              getFillColor: (item) => [34, 211, 238, 30 + Math.round(item.severity * 95)],
              getLineColor: [103, 232, 249, 115],
              getElevation: (item) => item.elevation,
              elevationScale: 1.5,
              extruded: true,
              filled: true,
              wireframe: false,
              pickable: true,
              transitions: { getElevation: { duration: 700 } },
            }),
          ]
        : []),
      ...(layers.hazards
        ? [
            new ColumnLayer<Hazard>({
              id: "hazard-red-zones",
              data: hazards,
              diskResolution: 8,
              radius: 680,
              getPosition: (item) => item.position,
              getElevation: (item) => item.height * (frame < 50 ? 0.78 : 1),
              getFillColor: (item) => [
                255,
                Math.round(52 + (1 - item.severity) * 54),
                62,
                Math.round(125 + item.severity * 95),
              ],
              elevationScale: 1,
              extruded: true,
              pickable: true,
              transitions: {
                getElevation: { duration: 900 },
                getFillColor: { duration: 900 },
              },
            }),
          ]
        : []),
      ...(layers.routes
        ? [
            new PathLayer<RouteFeature>({
              id: "evacuation-routes",
              data: routes,
              getPath: (item) => item.path,
              getColor: [45, 212, 191, 220],
              getWidth: 4,
              widthMinPixels: 2,
              jointRounded: true,
              capRounded: true,
              pickable: true,
            }),
          ]
        : []),
    ],
    [capacityCells, frame, hazards, layers, region, routes]
  );

  const severity = scenario === "BASELINE" ? 78 : scenario === "RAINFALL" ? 91 : 86;
  const frameLabel = frame < 35 ? "−06H" : frame < 70 ? "NOW" : `+${Math.round((frame - 70) / 5)}H`;
  const layerControls = [
    { id: "sar" as const, label: "Satellite SAR", detail: "Illustrative scene", icon: Satellite },
    { id: "hazards" as const, label: "3D Hazard Red Zones", detail: "Demo extrusion", icon: ShieldAlert },
    { id: "capacity" as const, label: "Carrying Capacity Hexagons (H3)", detail: "Synthetic grid", icon: Layers3 },
    { id: "routes" as const, label: "Evacuation Routes", detail: "Tabletop paths", icon: Route },
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col bg-[#060a10] text-slate-100">
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#080e17] px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-cyan-400/30 bg-cyan-400/10 font-mono text-xs font-bold text-cyan-300">
            IS
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-bold tracking-[0.12em] text-white sm:text-sm">
              ISIE <span className="font-normal text-slate-400">/ INTEGRATED SITUATION INTELLIGENCE ENGINE</span>
            </p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-amber-300/80">
              Tabletop visualization · Not an operational feed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider">
          <span className="hidden items-center gap-1.5 text-slate-400 sm:inline-flex">
            <Clock3 className="h-3.5 w-3.5" /> {clock} UTC
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            DEMO · NO LIVE PROVIDERS
          </span>
        </div>
        <nav aria-label="Crisis modules" className="flex w-full gap-1 overflow-x-auto lg:w-auto">
          {MODULES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setModule(item.id);
                setLayers((current) => ({ ...current, [item.layer]: true }));
              }}
              aria-pressed={module === item.id}
              className={`whitespace-nowrap rounded border px-2.5 py-1.5 text-left font-mono text-[9px] uppercase tracking-wider transition-colors ${
                module === item.id
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                  : "border-white/[0.08] text-slate-500 hover:text-slate-200"
              }`}
            >
              Module {item.label}: {item.name}
            </button>
          ))}
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="z-10 flex flex-col gap-3 border-b border-white/[0.08] bg-[#080e17] p-3 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Scenario telemetry
            </p>
            <span className="rounded border border-amber-400/20 px-1.5 py-0.5 font-mono text-[8px] text-amber-300">
              SIMULATED
            </span>
          </div>
          <Metric label="Hazard severity" value={`${severity}`} unit="/ 100" level="critical" progress={severity} icon={ShieldAlert} />
          <Metric label="Population exposure" value={scenario === "BASELINE" ? "18.4" : "24.7"} unit="K · demo" level="warning" progress={62} icon={Activity} />
          <Metric label="Water reserve" value={scenario === "BASELINE" ? "72" : "54"} unit="%" level={scenario === "BASELINE" ? "safe" : "warning"} progress={scenario === "BASELINE" ? 72 : 54} icon={Waves} />
          <Metric label="Road severance risk" value={scenario === "BASELINE" ? "MED" : "HIGH"} level={scenario === "BASELINE" ? "warning" : "critical"} progress={scenario === "BASELINE" ? 58 : 83} icon={Route} />

          <div className="mt-1 border-t border-white/[0.08] pt-3">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">Tabletop scenario</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScenario("RAINFALL")}
                className={`rounded border px-2 py-2 text-left font-mono text-[9px] uppercase tracking-wide ${
                  scenario === "RAINFALL" ? "border-rose-400/40 bg-rose-400/10 text-rose-200" : "border-white/[0.08] text-slate-400 hover:text-white"
                }`}
              >
                <CloudRain className="mb-1 h-3.5 w-3.5" />
                Heavy rainfall
              </button>
              <button
                type="button"
                onClick={() => setScenario("RIVER SURGE")}
                className={`rounded border px-2 py-2 text-left font-mono text-[9px] uppercase tracking-wide ${
                  scenario === "RIVER SURGE" ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/[0.08] text-slate-400 hover:text-white"
                }`}
              >
                <Waves className="mb-1 h-3.5 w-3.5" />
                River surge
              </button>
            </div>
            <button
              type="button"
              onClick={() => setScenario("BASELINE")}
              className="mt-2 w-full rounded border border-white/[0.08] px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-200"
            >
              Reset tabletop to baseline
            </button>
          </div>

          <div className="mt-auto hidden border-t border-white/[0.08] pt-3 lg:block">
            <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <Radio className="h-3 w-3 text-amber-300" /> Sentinel-1 / weather radar
            </p>
            <p className="mt-1 font-mono text-[9px] text-amber-300/80">Provider connection: not configured</p>
          </div>
        </aside>

        <main className="relative flex min-h-[560px] flex-col overflow-hidden lg:min-h-0">
          <div className="relative min-h-[500px] flex-1 bg-[#0a131c]">
            {token ? (
              <DeckGL
                viewState={viewState}
                onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as MapViewState)}
                controller
                layers={deckLayers}
                getTooltip={({ object }) => object?.name ?? (object?.severity ? `Scenario index ${Math.round(object.severity * 100)}` : null)}
              >
                <MapboxMap
                  ref={mapRef}
                  mapboxAccessToken={token}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  onLoad={onMapLoad}
                  maxPitch={75}
                  reuseMaps
                />
              </DeckGL>
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,rgba(18,52,65,0.5),transparent_58%),linear-gradient(145deg,#0b1720,#081019_60%,#0a1118)]">
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(103,232,249,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.15)_1px,transparent_1px)] [background-size:44px_44px]" />
                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15 shadow-[0_0_90px_rgba(34,211,238,0.06)] sm:h-[440px] sm:w-[440px]">
                  <div className="absolute inset-8 rounded-full border border-cyan-300/10" />
                  <div className="absolute inset-16 rounded-full border border-dashed border-cyan-300/10" />
                  <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-400 shadow-[0_0_28px_rgba(251,113,133,0.85)]" />
                </div>
                <div className="absolute bottom-5 left-1/2 w-[min(92%,440px)] -translate-x-1/2 rounded border border-amber-300/20 bg-[#080e17]/90 p-3 text-center backdrop-blur">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                    Mapbox terrain unavailable
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    Set <code className="text-cyan-200">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to enable the dark basemap and 3D terrain.
                  </p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded border border-white/10 bg-[#080e17]/90 px-3 py-2 backdrop-blur">
              <LocateFixed className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-white">{region.name}</p>
                <p className="truncate font-mono text-[9px] text-slate-500">{region.hazard} · illustrative scenario</p>
              </div>
            </div>

            <div className="absolute right-3 top-3 z-10 w-[min(260px,calc(100%-1.5rem))] rounded border border-white/10 bg-[#080e17]/95 p-2.5 shadow-xl backdrop-blur">
              <p className="mb-2 px-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                <Layers3 className="mr-1 inline h-3 w-3 text-cyan-300" /> Map layers
              </p>
              <div className="space-y-1">
                {layerControls.map(({ id, label, detail, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="switch"
                    aria-checked={layers[id]}
                    onClick={() => toggleLayer(id)}
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left hover:bg-white/[0.05]"
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${layers[id] ? "text-cyan-300" : "text-slate-600"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-mono text-[9px] ${layers[id] ? "text-slate-200" : "text-slate-500"}`}>{label}</span>
                      <span className="block font-mono text-[8px] text-slate-600">{detail}</span>
                    </span>
                    <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${layers[id] ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-200" : "border-slate-600 text-transparent"}`}>
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded border border-white/10 bg-[#080e17]/90 p-1.5">
              <Crosshair className="ml-1 h-3 w-3 text-cyan-300" />
              <label htmlFor="crisis-region" className="sr-only">Crisis region</label>
              <select
                id="crisis-region"
                value={regionId}
                onChange={(event) => changeRegion(event.target.value)}
                className="max-w-[185px] cursor-pointer appearance-none bg-transparent py-1 pl-1 pr-5 font-mono text-[9px] uppercase tracking-wider text-slate-200 outline-none"
              >
                {REGIONS.map((item) => <option key={item.id} value={item.id} className="bg-[#0b1119]">{item.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none -ml-5 h-3 w-3 text-slate-500" />
            </div>

            <div className="absolute bottom-3 right-3 z-10 hidden items-center gap-2 rounded border border-white/10 bg-[#080e17]/90 px-2.5 py-2 font-mono text-[8px] uppercase tracking-wider text-slate-500 sm:flex">
              <span className="text-rose-300">■</span> Hazard
              <span className="text-cyan-300">⬡</span> H3 capacity
              <span className="text-teal-300">━</span> Route
            </div>
          </div>

          <section aria-label="Scenario timeline" className="border-t border-white/[0.08] bg-[#080e17] px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-cyan-300" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">Scenario timeline</span>
                <span className="rounded border border-amber-300/20 px-1 py-0.5 font-mono text-[8px] text-amber-300">SIMULATION</span>
              </div>
              <span className="font-mono text-[9px] text-slate-500">−06H <span className="mx-1 text-cyan-300">/ {frameLabel} /</span> +06H · DEMO FRAMES</span>
            </div>
            <input
              aria-label="Scrub historical and simulated scenario frames"
              type="range"
              min="0"
              max="100"
              value={frame}
              onChange={(event) => setFrame(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded bg-slate-700 accent-cyan-300"
            />
            <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-wider text-slate-600">
              <span>−06:00</span><span>−03:00</span><span>NOW · EXERCISE</span><span>+03:00</span><span>+06:00</span>
            </div>
          </section>
        </main>
      </div>
      <div className="flex items-center justify-center gap-1.5 border-t border-white/[0.06] bg-[#070b11] px-3 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
        <AlertTriangle className="h-3 w-3 text-amber-400/70" />
        Fictional tabletop data · no live satellite imagery, emergency routing, or verified risk assessment
      </div>
    </div>
  );
}
