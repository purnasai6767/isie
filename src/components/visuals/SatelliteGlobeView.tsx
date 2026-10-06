"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup, ScaleControl, type MapRef } from "react-map-gl/mapbox";
import type { ErrorEvent, StyleSpecification } from "mapbox-gl";
import {
  Crosshair,
  Globe2,
  MapPin,
  Moon,
  Satellite,
  ShieldAlert,
  Sun,
} from "lucide-react";
import type { IntelligenceEvent } from "@/lib/types/isie";

type Surface = "SATELLITE" | "TACTICAL" | "NIGHT";

type RegionTarget = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
};

const REGION_TARGETS: Record<string, RegionTarget> = {
  ALL: { longitude: 25, latitude: 18, zoom: 1.35, pitch: 0 },
  HIM: { longitude: 82, latitude: 30, zoom: 5.3, pitch: 35 },
  NOR: { longitude: 91, latitude: 27, zoom: 5, pitch: 35 },
  CST: { longitude: 86, latitude: 17, zoom: 4.5, pitch: 30 },
  PEN: { longitude: 78, latitude: 12, zoom: 5, pitch: 35 },
};

const regionSurfaceStyle: StyleSpecification = {
  version: 8,
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxzoom: 19,
    },
  },
  layers: [{ id: "esri-imagery", type: "raster", source: "esri-imagery" }],
};

const regionStreetStyle: StyleSpecification = {
  version: 8,
  sources: {
    "esri-streets": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Map data and tiles © Esri",
      maxzoom: 19,
    },
  },
  layers: [{ id: "esri-streets", type: "raster", source: "esri-streets" }],
};

const STYLES_WITH_TERRAIN = new Set<Surface>(["SATELLITE", "TACTICAL"]);

function getMapStyle(surface: Surface, hasMapboxToken: boolean): string | StyleSpecification {
  if (!hasMapboxToken) {
    return surface === "SATELLITE" ? regionSurfaceStyle : regionStreetStyle;
  }
  if (surface === "TACTICAL") return "mapbox://styles/mapbox/dark-v11";
  if (surface === "NIGHT") return "mapbox://styles/mapbox/navigation-night-v1";
  return "mapbox://styles/mapbox/satellite-v9";
}

function severityColor(incident: IntelligenceEvent): string {
  if (incident.severity === "CRITICAL") return "#fb7185";
  if (incident.severity === "HIGH" || incident.severity === "MEDIUM") return "#fbbf24";
  return "#34d399";
}

interface SatelliteGlobeViewProps {
  incidents: IntelligenceEvent[];
  selectedRegion: string;
  selectedIncidentId: string | null;
  onSelectIncident: (incident: IntelligenceEvent | null) => void;
}

export default function SatelliteGlobeView({
  incidents,
  selectedRegion,
  selectedIncidentId,
  onSelectIncident,
}: SatelliteGlobeViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [surface, setSurface] = useState<Surface>("SATELLITE");
  const [mapError, setMapError] = useState("");
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const mapStyle = useMemo(() => getMapStyle(surface, Boolean(token)), [surface, token]);
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId);
  const target = REGION_TARGETS[selectedRegion] ?? REGION_TARGETS.ALL;

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const enableTerrain = () => {
      if (!token || !STYLES_WITH_TERRAIN.has(surface) || !map.isStyleLoaded()) return;
      if (!map.getSource("isie-terrain-dem")) {
        map.addSource("isie-terrain-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "isie-terrain-dem", exaggeration: 1.15 });
    };

    if (map.isStyleLoaded()) enableTerrain();
    else map.once("style.load", enableTerrain);
    return () => {
      map.off("style.load", enableTerrain);
    };
  }, [mapStyle, surface, token]);

  useEffect(() => {
    mapRef.current?.flyTo({
      center: [target.longitude, target.latitude],
      zoom: target.zoom,
      pitch: target.pitch,
      duration: 1400,
      essential: true,
    });
  }, [target.latitude, target.longitude, target.pitch, target.zoom]);

  useEffect(() => {
    if (!selectedIncident) return;
    mapRef.current?.flyTo({
      center: [selectedIncident.coordinates.lng, selectedIncident.coordinates.lat],
      zoom: Math.max(mapRef.current.getZoom(), 6.5),
      pitch: 40,
      duration: 1200,
      essential: true,
    });
  }, [selectedIncident]);

  const resetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: [target.longitude, target.latitude],
      zoom: target.zoom,
      pitch: target.pitch,
      bearing: 0,
      duration: 1200,
      essential: true,
    });
    onSelectIncident(null);
  }, [onSelectIncident, target]);

  const handleMapError = useCallback((event: ErrorEvent) => {
    const message = event.error?.message ?? "The map provider could not load imagery.";
    setMapError(message);
  }, []);

  const surfaceOptions: { id: Surface; label: string; icon: typeof Satellite }[] = [
    { id: "SATELLITE", label: "SATELLITE", icon: Satellite },
    { id: "TACTICAL", label: "TACTICAL", icon: ShieldAlert },
    { id: "NIGHT", label: "NIGHT", icon: Moon },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b11]">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        projection={{ name: "globe" }}
        initialViewState={{
          longitude: target.longitude,
          latitude: target.latitude,
          zoom: target.zoom,
          pitch: target.pitch,
          bearing: 0,
        }}
        minZoom={0.7}
        maxZoom={18}
        maxPitch={70}
        onError={handleMapError}
        onLoad={() => setMapError("")}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        attributionControl
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass showZoom />
        <ScaleControl position="bottom-left" unit="metric" />
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            longitude={incident.coordinates.lng}
            latitude={incident.coordinates.lat}
            anchor="center"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onSelectIncident(incident);
            }}
          >
            <button
              type="button"
              aria-label={`${incident.eventCode}: ${incident.title}`}
              className="group flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-[#07111b]/90 shadow-[0_0_18px_rgba(0,0,0,0.8)] transition-transform hover:scale-125"
            >
              <span
                className="h-3 w-3 rounded-full ring-4 ring-white/10"
                style={{ backgroundColor: severityColor(incident) }}
              />
            </button>
          </Marker>
        ))}
        {selectedIncident && (
          <Popup
            longitude={selectedIncident.coordinates.lng}
            latitude={selectedIncident.coordinates.lat}
            anchor="bottom"
            onClose={() => onSelectIncident(null)}
            closeButton
            closeOnClick={false}
            className="isie-map-popup"
          >
            <div className="min-w-48 text-slate-900">
              <p className="font-mono text-[10px] font-bold">{selectedIncident.eventCode} · {selectedIncident.severity}</p>
              <p className="mt-1 text-xs font-semibold">{selectedIncident.title}</p>
              <p className="mt-1 text-[10px] text-slate-600">{selectedIncident.locationName}</p>
              <p className="mt-2 border-t border-slate-200 pt-1 font-mono text-[8px] uppercase tracking-wider text-amber-700">
                Demo exercise record · not a verified live incident
              </p>
            </div>
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1 rounded border border-white/10 bg-[#080e17]/90 p-1 backdrop-blur">
        {surfaceOptions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMapError("");
              setSurface(id);
            }}
            aria-pressed={surface === id}
            className={`pointer-events-auto flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[9px] tracking-wider transition-colors ${
              surface === id
                ? "bg-cyan-400/15 text-cyan-200"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-10 flex max-w-[min(280px,calc(100%-1.5rem))] items-center gap-2 rounded border border-white/10 bg-[#080e17]/90 px-3 py-2 backdrop-blur">
        <Globe2 className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
        <div className="min-w-0">
          <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-100">
            {token ? "Mapbox satellite imagery" : "Esri satellite imagery"}
          </p>
          <p className="truncate font-mono text-[8px] text-slate-500">
            {token && STYLES_WITH_TERRAIN.has(surface) ? "3D terrain enabled · published imagery" : "Interactive globe · published imagery"}
          </p>
        </div>
        <Sun className="h-3 w-3 shrink-0 text-amber-300" />
      </div>

      <button
        type="button"
        onClick={resetView}
        className="absolute bottom-12 left-3 z-10 inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#080e17]/90 px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-300 backdrop-blur hover:border-cyan-300/30 hover:text-cyan-200"
      >
        <Crosshair className="h-3 w-3 text-cyan-300" />
        Reset globe
      </button>

      {mapError && (
        <div role="status" className="absolute bottom-12 left-1/2 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded border border-amber-400/30 bg-[#111318]/95 px-3 py-2 font-mono text-[9px] text-amber-200 shadow-xl">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>Map imagery could not load. Check network access or map provider settings.</span>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded border border-amber-300/20 bg-[#080e17]/90 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-wider text-amber-200/90 backdrop-blur">
        Demo incident markers · not live crisis data
      </div>
    </div>
  );
}
