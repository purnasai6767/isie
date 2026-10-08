"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { FlyToInterpolator, type MapViewState } from "@deck.gl/core";
import MapboxMap, { type MapRef } from "react-map-gl/mapbox";
import MapLibreMap, { type MapRef as MapLibreMapRef } from "react-map-gl/maplibre";
import { latLngToCell } from "h3-js";
import { setWorkerUrl } from "maplibre-gl";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox";
import { useEonetFeed } from "@/lib/hooks/useEonetFeed";
import { useUsgsEarthquakeFeed } from "@/lib/hooks/useUsgsEarthquakeFeed";
import type { EonetEvent } from "@/lib/types/eonet";
import type { UsgsEarthquake } from "@/lib/types/usgs";
import type { PublicWeatherForecast } from "@/lib/types/publicWeather";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  Crosshair,
  Layers3,
  LocateFixed,
  Radio,
  Route,
  Satellite,
  ShieldAlert,
} from "lucide-react";

setWorkerUrl("/maplibre-gl-worker.mjs");

type Region = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  zoom: number;
  hazard: string;
};

type EventHex = {
  hex: string;
  count: number;
};

type CatalogEvent = {
  position: [number, number];
  title: string;
  source: "NASA EONET" | "USGS";
  details: string;
  observedAt: string | null;
  sourceUrl: string | null;
};

const REGIONS: Region[] = [
  {
    id: "uttarakhand",
    name: "Uttarakhand · Chamoli",
    latitude: 30.402,
    longitude: 79.32,
    zoom: 10.4,
    hazard: "Regional observation point",
  },
  {
    id: "assam",
    name: "Assam · Guwahati",
    latitude: 26.18,
    longitude: 91.73,
    zoom: 10.5,
    hazard: "Regional observation point",
  },
  {
    id: "kerala",
    name: "Kerala · Wayanad",
    latitude: 11.61,
    longitude: 76.13,
    zoom: 10.3,
    hazard: "Regional observation point",
  },
];

const MODULES = [
  { id: "hazard", label: "01", name: "Public Hazard Catalog", layer: "events" },
  { id: "capacity", label: "02", name: "Catalog Event Density", layer: "hexagons" },
  { id: "relocation", label: "03", name: "Routing Data Gaps", layer: "routes" },
] as const;

const INITIAL_LAYERS = {
  sar: false,
  water: false,
  events: true,
  hexagons: true,
  routes: false,
};

function makeCatalogEvents(eonet: EonetEvent[], earthquakes: UsgsEarthquake[]): CatalogEvent[] {
  return [
    ...eonet.flatMap((event) =>
      event.location
        ? [{
            position: [event.location.longitude, event.location.latitude] as [number, number],
            title: event.title,
            source: "NASA EONET" as const,
            details: event.categories.join(", ") || "Open natural-event catalog entry",
            observedAt: event.observedAt,
            sourceUrl: event.sourceUrl,
          }]
        : []
    ),
    ...earthquakes.map((event) => ({
      position: [event.coordinates.longitude, event.coordinates.latitude] as [number, number],
      title: event.title,
      source: "USGS" as const,
      details: `${event.magnitude === null ? "Magnitude not reported" : `Magnitude ${event.magnitude.toFixed(1)}`} · ${event.place}`,
      observedAt: event.observedAt,
      sourceUrl: event.sourceUrl,
    })),
  ];
}

function makeEventHexagons(events: CatalogEvent[]): EventHex[] {
  const cells = new Map<string, number>();
  for (const event of events) {
    const hex = latLngToCell(event.position[1], event.position[0], 4);
    cells.set(hex, (cells.get(hex) ?? 0) + 1);
  }
  return Array.from(cells, ([hex, count]) => ({ hex, count }));
}

function isWeatherForecast(value: unknown): value is PublicWeatherForecast {
  if (typeof value !== "object" || value === null) return false;
  return (
    "fetchedAt" in value &&
    typeof value.fetchedAt === "string" &&
    "location" in value &&
    typeof value.location === "object" &&
    value.location !== null &&
    "latitude" in value.location &&
    typeof value.location.latitude === "number" &&
    "longitude" in value.location &&
    typeof value.location.longitude === "number" &&
    "current" in value &&
    typeof value.current === "object" &&
    value.current !== null &&
    "time" in value.current &&
    typeof value.current.time === "string" &&
    "daily" in value &&
    Array.isArray(value.daily) &&
    value.daily.every(
      (day) =>
        typeof day === "object" &&
        day !== null &&
        "date" in day &&
        typeof day.date === "string" &&
        "precipitationMm" in day &&
        (typeof day.precipitationMm === "number" || day.precipitationMm === null) &&
        "precipitationProbabilityMaxPercent" in day &&
        (typeof day.precipitationProbabilityMaxPercent === "number" ||
          day.precipitationProbabilityMaxPercent === null)
    )
  );
}

function Metric({
  label,
  value,
  detail,
  source,
}: {
  label: string;
  value: string;
  detail: string;
  source: string;
}) {
  return (
    <div className="rounded border border-white/[0.08] bg-[#0a111b]/90 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xl font-semibold tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{detail}</p>
      <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-cyan-300/70">{source}</p>
    </div>
  );
}

export default function SpatialIntelligenceDashboard() {
  const [regionId, setRegionId] = useState(REGIONS[0].id);
  const [module, setModule] = useState<(typeof MODULES)[number]["id"]>("hazard");
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [forecastDay, setForecastDay] = useState(0);
  const [clock, setClock] = useState("--:--:--");
  const [weather, setWeather] = useState<PublicWeatherForecast | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: REGIONS[0].longitude,
    latitude: REGIONS[0].latitude,
    zoom: REGIONS[0].zoom,
    pitch: 45,
    bearing: 0,
  });
  const mapRef = useRef<MapRef>(null);
  const mapLibreRef = useRef<MapLibreMapRef>(null);
  const { feed: eonetFeed, error: eonetError, loading: eonetLoading } = useEonetFeed();
  const { feed: earthquakeFeed, error: earthquakeError, loading: earthquakeLoading } = useUsgsEarthquakeFeed();
  const token = MAPBOX_ACCESS_TOKEN;
  const region = REGIONS.find((item) => item.id === regionId) ?? REGIONS[0];
  const catalogEvents = useMemo(
    () => makeCatalogEvents(eonetFeed?.events ?? [], earthquakeFeed?.events ?? []),
    [eonetFeed, earthquakeFeed]
  );
  const eventHexagons = useMemo(() => makeEventHexagons(catalogEvents), [catalogEvents]);
  const activeForecast = weather?.daily[forecastDay] ?? weather?.daily[0];
  const fallbackMapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {
        "isie-esri-imagery": {
          type: "raster" as const,
          tiles: ["/api/map-tiles/esri-imagery/{z}/{x}/{y}"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
        "isie-esri-labels": {
          type: "raster" as const,
          tiles: ["/api/map-tiles/esri-labels/{z}/{x}/{y}"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "Boundaries and place names © Esri",
        },
        "isie-terrain-dem": {
          type: "raster-dem" as const,
          tiles: ["/api/map-tiles/terrain-dem/{z}/{x}/{y}"],
          tileSize: 256,
          maxzoom: 15,
          encoding: "terrarium" as const,
          attribution: "AWS Terrain Tiles · Mapzen · CC BY 4.0",
        },
        ...(layers.sar
          ? {
              "isie-nasa-sar": {
                type: "raster" as const,
                tiles: ["/api/map-tiles/nasa-sar/{z}/{x}/{y}"],
                tileSize: 256,
                maxzoom: 12,
                attribution: "NASA GIBS · OPERA Sentinel-1 RTC SAR",
              },
            }
          : {}),
        ...(layers.water
          ? {
              "isie-nasa-water": {
                type: "raster" as const,
                tiles: ["/api/map-tiles/nasa-water/{z}/{x}/{y}"],
                tileSize: 256,
                maxzoom: 12,
                attribution: "NASA GIBS · OPERA Sentinel-1 Dynamic Surface Water Extent",
              },
            }
          : {}),
      },
      layers: [
        { id: "isie-esri-imagery-layer", type: "raster" as const, source: "isie-esri-imagery" },
        ...(layers.sar
          ? [{
              id: "isie-nasa-sar-layer",
              type: "raster" as const,
              source: "isie-nasa-sar",
              paint: { "raster-opacity": 0.72 },
            }]
          : []),
        ...(layers.water
          ? [{
              id: "isie-nasa-water-layer",
              type: "raster" as const,
              source: "isie-nasa-water",
              paint: { "raster-opacity": 0.78 },
            }]
          : []),
        { id: "isie-esri-labels-layer", type: "raster" as const, source: "isie-esri-labels" },
      ],
      terrain: { source: "isie-terrain-dem", exaggeration: 1.25 },
    }),
    [layers.sar, layers.water]
  );

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

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadForecast = async () => {
      setWeatherLoading(true);
      setWeatherError("");
      try {
        const params = new URLSearchParams({
          latitude: String(region.latitude),
          longitude: String(region.longitude),
          label: region.name,
        });
        const response = await fetch(`/api/public-weather?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
              ? result.error
              : `Regional forecast failed (HTTP ${response.status}).`;
          throw new Error(message);
        }
        if (!isWeatherForecast(result)) throw new Error("Regional forecast returned an unexpected data format.");
        if (active) setWeather(result);
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setWeatherError(error instanceof Error ? error.message : "Could not load regional forecast.");
          setWeather(null);
        }
      } finally {
        if (active) setWeatherLoading(false);
      }
    };
    void loadForecast();
    const interval = window.setInterval(() => void loadForecast(), 30 * 60 * 1000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [region]);

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

  useEffect(() => {
    if (!token) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const installImageryOverlays = () => {
      const overlays = [
        {
          id: "isie-nasa-sar",
          sourceId: "isie-nasa-sar",
          layerId: "isie-nasa-sar-layer",
          url: "/api/map-tiles/nasa-sar/{z}/{x}/{y}",
          attribution: "NASA GIBS · OPERA Sentinel-1 RTC SAR",
          opacity: 0.72,
          visible: layers.sar,
        },
        {
          id: "isie-nasa-water",
          sourceId: "isie-nasa-water",
          layerId: "isie-nasa-water-layer",
          url: "/api/map-tiles/nasa-water/{z}/{x}/{y}",
          attribution: "NASA GIBS · OPERA Sentinel-1 Dynamic Surface Water Extent",
          opacity: 0.78,
          visible: layers.water,
        },
      ];
      for (const overlay of overlays) {
        if (!map.getSource(overlay.sourceId)) {
          map.addSource(overlay.sourceId, {
            type: "raster",
            tiles: [overlay.url],
            tileSize: 256,
            maxzoom: 12,
            attribution: overlay.attribution,
          });
        }
        if (!map.getLayer(overlay.layerId)) {
          map.addLayer({
            id: overlay.layerId,
            type: "raster",
            source: overlay.sourceId,
            paint: { "raster-opacity": overlay.opacity },
          });
        }
        map.setLayoutProperty(overlay.layerId, "visibility", overlay.visible ? "visible" : "none");
      }
    };
    if (map.isStyleLoaded()) installImageryOverlays();
    else map.once("style.load", installImageryOverlays);
    return () => {
      map.off("style.load", installImageryOverlays);
    };
  }, [layers.sar, layers.water, token]);

  const changeRegion = (id: string) => {
    const next = REGIONS.find((item) => item.id === id);
    if (!next) return;
    setRegionId(id);
    setViewState((current) => ({
      ...current,
      longitude: next.longitude,
      latitude: next.latitude,
      zoom: next.zoom,
      pitch: 45,
      bearing: 0,
      transitionDuration: 1350,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.15 }),
    }));
  };

  const toggleLayer = (id: keyof typeof INITIAL_LAYERS) =>
    setLayers((current) => ({ ...current, [id]: !current[id] }));

  const deckLayers = useMemo(
    () => [
      ...(layers.hexagons
        ? [
            new H3HexagonLayer<EventHex>({
              id: "public-event-density-h3",
              data: eventHexagons,
              getHexagon: (item) => item.hex,
              getFillColor: (item) => [34, 211, 238, Math.min(190, 40 + item.count * 28)],
              getLineColor: [103, 232, 249, 115],
              filled: true,
              wireframe: false,
              pickable: true,
            }),
          ]
        : []),
      ...(layers.events
        ? [
            new ScatterplotLayer<CatalogEvent>({
              id: "verified-public-catalog-events",
              data: catalogEvents,
              getPosition: (item) => item.position,
              getRadius: (item) => item.source === "USGS" ? 5000 : 3200,
              getFillColor: (item) => item.source === "USGS" ? [251, 146, 60, 220] : [251, 191, 36, 220],
              getLineColor: [255, 255, 255, 210],
              radiusMinPixels: 4,
              radiusMaxPixels: 14,
              lineWidthMinPixels: 1,
              stroked: true,
              filled: true,
              pickable: true,
            }),
          ]
        : []),
    ],
    [catalogEvents, eventHexagons, layers.events, layers.hexagons]
  );

  const sourceStatus = (loading: boolean, error: string, loaded: boolean) =>
    error ? "UNAVAILABLE" : loading ? "LOADING" : loaded ? "CONNECTED" : "NO DATA";
  const layerControls = [
    { id: "sar" as const, label: "Satellite SAR · Sentinel-1", detail: "NASA OPERA RTC · best available", icon: Satellite, disabled: false },
    { id: "water" as const, label: "Observed surface water", detail: "NASA OPERA DSWx-S1 · satellite classification", icon: Activity, disabled: false },
    { id: "events" as const, label: "Public hazard catalog", detail: "NASA EONET + USGS", icon: ShieldAlert, disabled: false },
    { id: "hexagons" as const, label: "Catalog event density · H3", detail: "Event counts only · not population", icon: Layers3, disabled: false },
    { id: "routes" as const, label: "Evacuation routes", detail: "No verified routing service connected", icon: Route, disabled: true },
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
              Public data layers · Independent catalogs · Not an operational warning system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider">
          <span className="hidden items-center gap-1.5 text-slate-400 sm:inline-flex">
            <Clock3 className="h-3.5 w-3.5" /> {clock} UTC
          </span>
          <span className="inline-flex items-center gap-1.5 text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            NASA / USGS / OPEN-METEO
          </span>
        </div>
        <nav aria-label="Crisis modules" className="flex w-full gap-1 overflow-x-auto lg:w-auto">
          {MODULES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setModule(item.id);
                if (item.layer !== "routes") {
                  setLayers((current) => ({ ...current, [item.layer]: true }));
                }
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
              Public data snapshot
            </p>
            <span className="rounded border border-cyan-400/20 px-1.5 py-0.5 font-mono text-[8px] text-cyan-300">
              {weatherLoading ? "SYNCING" : "FEED STATUS"}
            </span>
          </div>
          <Metric
            label="NASA EONET open events"
            value={eonetLoading ? "Loading…" : eonetError ? "Unavailable" : String(eonetFeed?.events.length ?? 0)}
            detail={`${eonetFeed?.events.filter((event) => event.location).length ?? 0} with point locations; events without points are not mapped.`}
            source={`NASA EONET · ${sourceStatus(eonetLoading, eonetError, Boolean(eonetFeed))}`}
          />
          <Metric
            label="USGS earthquakes · past day"
            value={earthquakeLoading ? "Loading…" : earthquakeError ? "Unavailable" : String(earthquakeFeed?.events.length ?? 0)}
            detail="Catalog count only. Completeness and magnitude thresholds vary; this is not an impact score."
            source={`USGS GeoJSON · ${sourceStatus(earthquakeLoading, earthquakeError, Boolean(earthquakeFeed))}`}
          />
          <Metric
            label="Forecast · selected day"
            value={weatherLoading ? "Loading…" : activeForecast?.precipitationMm === null || activeForecast?.precipitationMm === undefined ? "Unavailable" : `${activeForecast.precipitationMm} mm`}
            detail={activeForecast?.precipitationProbabilityMaxPercent === null || activeForecast?.precipitationProbabilityMaxPercent === undefined
              ? weatherError || "Forecast probability not reported."
              : `${activeForecast.precipitationProbabilityMaxPercent}% model precipitation probability; not a warning.`}
            source={`Open-Meteo · ${weather?.location.timezone ?? "regional forecast"}${weatherError ? " · unavailable" : ""}`}
          />
          <Metric
            label="Population / shelter capacity"
            value="Not connected"
            detail="No validated population raster, shelter inventory, or live reserve telemetry is configured."
            source="Capacity assessment unavailable"
          />
          <div className="mt-auto border-t border-white/[0.08] pt-3">
            <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <Radio className="h-3 w-3 text-cyan-300" /> Data providers
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              NASA EONET · USGS · Open-Meteo · NASA GIBS/OPERA Sentinel-1 RTC. Refresh intervals and coverage differ by source.
            </p>
          </div>
        </aside>

        <main className="relative flex min-h-[560px] flex-col overflow-hidden lg:min-h-0">
          <div className="relative min-h-[500px] flex-1 bg-[#0a131c]">
            <DeckGL
              viewState={viewState}
              onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as MapViewState)}
              controller
              layers={deckLayers}
              getTooltip={({ object }) => {
                if (!object) return null;
                if ("source" in object) {
                  const event = object as CatalogEvent;
                  return `${event.source} · ${event.title}\n${event.details}${event.observedAt ? `\nObserved ${new Date(event.observedAt).toLocaleString()}` : ""}`;
                }
                if ("count" in object) return `${object.count} public catalog event(s) in this H3 cell`;
                return null;
              }}
            >
              {token ? (
                <MapboxMap
                  ref={mapRef}
                  mapboxAccessToken={token}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  projection={{ name: "globe" }}
                  onLoad={onMapLoad}
                  maxPitch={75}
                  reuseMaps
                />
              ) : (
                <MapLibreMap
                  ref={mapLibreRef}
                  mapStyle={fallbackMapStyle}
                  projection="globe"
                  maxPitch={75}
                  reuseMaps
                />
              )}
            </DeckGL>

            <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded border border-white/10 bg-[#080e17]/90 px-3 py-2 backdrop-blur">
              <LocateFixed className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-white">{region.name}</p>
                <p className="truncate font-mono text-[9px] text-slate-500">{region.hazard} · catalog coverage varies by event</p>
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
                    aria-disabled={id === "routes" || undefined}
                    disabled={id === "routes"}
                    onClick={() => toggleLayer(id)}
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
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
              <span className="text-amber-300">●</span> NASA EONET
              <span className="text-orange-300">●</span> USGS
              <span className="text-cyan-300">⬡</span> Event density
              <span className="text-emerald-300">▲</span> AWS terrain
            </div>
          </div>

          <section aria-label="Regional forecast timeline" className="border-t border-white/[0.08] bg-[#080e17] px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-cyan-300" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">7-day regional precipitation forecast</span>
                <span className="rounded border border-cyan-300/20 px-1 py-0.5 font-mono text-[8px] text-cyan-300">MODEL OUTPUT</span>
              </div>
              <span className="font-mono text-[9px] text-slate-400">
                {activeForecast
                  ? `${new Date(`${activeForecast.date}T00:00:00`).toLocaleDateString()} · ${activeForecast.precipitationMm ?? "—"} mm · ${activeForecast.precipitationProbabilityMaxPercent ?? "—"}% probability`
                  : weatherError || (weatherLoading ? "Fetching regional forecast…" : "Forecast unavailable")}
              </span>
            </div>
            <input
              aria-label="Select day in the seven-day regional precipitation forecast"
              type="range"
              min="0"
              max={Math.max(0, (weather?.daily.length ?? 1) - 1)}
              value={Math.min(forecastDay, Math.max(0, (weather?.daily.length ?? 1) - 1))}
              disabled={!weather?.daily.length}
              onChange={(event) => setForecastDay(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded bg-slate-700 accent-cyan-300"
            />
            <div className="mt-1 flex justify-between gap-1 font-mono text-[8px] uppercase tracking-wider text-slate-500">
              {(weather?.daily ?? []).map((day) => (
                <button
                  key={day.date}
                  type="button"
                  aria-label={`Show forecast for ${day.date}`}
                  aria-pressed={weather?.daily[forecastDay]?.date === day.date}
                  onClick={() => setForecastDay(weather?.daily.findIndex((entry) => entry.date === day.date) ?? 0)}
                  className="rounded px-1 py-0.5 hover:bg-white/5 aria-pressed:text-cyan-300"
                >
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-slate-500">
              Open-Meteo model forecast for {weather?.location.name ?? region.name}; not measured rainfall, an alert, or a flood prediction.
              {weather && <> · <a className="text-cyan-300/80 hover:text-cyan-200" href={weather.attributionUrl} target="_blank" rel="noreferrer">Source &amp; attribution</a></>}
            </p>
          </section>
        </main>
      </div>
      <div className="flex items-center justify-center gap-1.5 border-t border-white/[0.06] bg-[#070b11] px-3 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
        <AlertTriangle className="h-3 w-3 text-amber-400/70" />
        Public catalog observations and model forecasts · event clustering is not population data · evacuation routing and shelter capacity are not connected
      </div>
    </div>
  );
}
