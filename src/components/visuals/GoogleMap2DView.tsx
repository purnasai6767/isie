"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Compass,
  Mountain,
  Waves,
  Eye,
  Crosshair,
  Shield,
  Activity,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { IntelligenceEvent } from "@/lib/types/isie";
import {
  loadGoogleMaps,
  getGoogleMapsApiKey,
  isGoogleMapsConfigured,
  GMP_ATTRIBUTION_ID,
} from "@/lib/services/googleMapsLoader";
import {
  INDIAN_STATES,
  RIVER_PATHS,
  NEIGHBOURING_COUNTRIES,
  MAJOR_WATER_BODIES,
  PHYSIOGRAPHIC_FEATURES,
  MOUNTAIN_PEAKS_AND_PASSES,
  STRATEGIC_WATER_AND_DAMS,
  STRATEGIC_DISTRICT_HUBS,
  SAFE_SHELTERS,
  CRITICAL_EVACUATION_CORRIDORS,
  ROAD_CUTOFF_CHOKEPOINTS,
  AUTHORITATIVE_HAZARD_ZONES,
  CENTRAL_COMMAND_HQ,
} from "@/lib/constants/indiaGeographicData";
import { BasemapQuickToggle, BasemapMode } from "./BasemapQuickToggle";

export interface GoogleMap2DViewProps {
  className?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IntelligenceEvent | null) => void;
  incidents?: IntelligenceEvent[];
  onFallbackToLeaflet?: () => void;
  basemap?: BasemapMode;
  onBasemapChange?: (mode: BasemapMode) => void;
  activeLayers?: Record<string, boolean>;
  layerOpacities?: Record<string, number>;
}

// Tactical Dark Theme Style for Google Maps
const TACTICAL_DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d131f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d131f" }, { weight: 2 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7488a1" }] },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ff7a18" }, { weight: 1.5 }],
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ color: "#253347" }, { weight: 1 }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a0b3c6" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#070c14" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
  {
    featureType: "landscape.natural.terrain",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1b2533" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
];

export const GoogleMap2DView: React.FC<GoogleMap2DViewProps> = ({
  className = "",
  onToggleFullscreen,
  isFullscreen = false,
  selectedIncidentId = null,
  onSelectIncident,
  incidents,
  onFallbackToLeaflet,
  basemap: propBasemap,
  onBasemapChange,
  activeLayers: propActiveLayers,
  layerOpacities: propLayerOpacities,
}) => {
  const activeIncidents = incidents ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Array<any>>([]);
  const polylinesRef = useRef<Array<google.maps.Polyline>>([]);
  const polygonsRef = useRef<Array<google.maps.Polygon>>([]);
  const infoWindowsRef = useRef<Array<google.maps.InfoWindow>>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [mapType, setMapType] = useState<"hybrid" | "terrain" | "tactical">(
    propBasemap === "street" ? "tactical" : "hybrid"
  );
  const [currentBasemap, setCurrentBasemap] = useState<BasemapMode>(propBasemap || "satellite");
  const [layersOpen, setLayersOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<IntelligenceEvent | null>(null);

  // Dynamically sync layer opacities to Google Maps polygons and polylines
  useEffect(() => {
    if (!mapRef.current || !propLayerOpacities) return;
    const redZoneOp = propLayerOpacities["layer-red-zones"] ?? 0.85;
    const evacOp = propLayerOpacities["layer-evacuation-corridors"] ?? 0.75;
    const redZoneVisible = propActiveLayers ? propActiveLayers["layer-red-zones"] !== false : true;
    const evacVisible = propActiveLayers ? propActiveLayers["layer-evacuation-corridors"] !== false : true;

    polygonsRef.current.forEach((polygon) => {
      polygon.setOptions({
        visible: redZoneVisible,
        strokeOpacity: redZoneOp,
        fillOpacity: Math.min(1, redZoneOp * 0.25),
      });
    });

    polylinesRef.current.forEach((poly) => {
      poly.setOptions({
        visible: evacVisible,
        strokeOpacity: evacOp,
      });
    });
  }, [propLayerOpacities, propActiveLayers]);

  useEffect(() => {
    if (propBasemap && propBasemap !== currentBasemap) {
      setCurrentBasemap(propBasemap);
      if (mapRef.current) {
        if (propBasemap === "satellite") {
          mapRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID);
          setMapType("hybrid");
        } else {
          mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
          setMapType("tactical");
        }
      }
    }
  }, [propBasemap]);

  const handleBasemapToggle = (mode: BasemapMode) => {
    setCurrentBasemap(mode);
    onBasemapChange?.(mode);
    if (mapRef.current) {
      if (mode === "satellite") {
        mapRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID);
        setMapType("hybrid");
      } else {
        mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        setMapType("tactical");
      }
    }
  };

  // Layer Toggles
  const [layerVisibility, setLayerVisibility] = useState({
    boundaries: true,
    rivers: true,
    terrain: true,
    incidents: true,
    hazardZones: false,
    evacuationCorridors: false,
    shelters: false,
  });

  // Geographic Navigation Presets for Operator
  const GEO_PRESETS = [
    { label: "ALL INDIA", lat: 22.5937, lng: 78.9629, zoom: 5 },
    { label: "HIMALAYAS (NORTH)", lat: 30.5541, lng: 79.5663, zoom: 8 },
    { label: "BRAHMAPUTRA (EAST)", lat: 26.6854, lng: 93.3512, zoom: 8 },
    { label: "ODISHA COAST", lat: 19.8135, lng: 85.8312, zoom: 8 },
    { label: "CAUVERY BASIN (SOUTH)", lat: 11.7962, lng: 77.8016, zoom: 8 },
  ];

  // Initialize Google Maps instance
  useEffect(() => {
    let isCancelled = false;

    // Handle asynchronous auth failure or referer restriction from Google Maps
    const handleAuthFailure = () => {
      if (isCancelled) return;
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
      setLoadError(
        `Google Maps authorization notice: Domain ${currentOrigin} is unauthorized on the current key. Switching to Offline Tactical Map.`
      );
      setLoading(false);
      if (onFallbackToLeaflet) {
        setTimeout(() => {
          if (!isCancelled) {
            onFallbackToLeaflet();
          }
        }, 500);
      }
    };

    window.addEventListener("gmp-auth-failure", handleAuthFailure);

    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      handleAuthFailure();
      if (typeof prevAuthFailure === "function") prevAuthFailure();
    };

    async function initMap() {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setLoadError(null);

        const google = await loadGoogleMaps();
        if (isCancelled || !containerRef.current) return;

        // Create standard Google Maps instance
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 22.5937, lng: 78.9629 }, // Center of India
          zoom: 5,
          minZoom: 4,
          maxZoom: 18,
          mapTypeId: mapType === "tactical" ? google.maps.MapTypeId.ROADMAP : (mapType as any),
          disableDefaultUI: true,
          gestureHandling: "greedy",
          styles: mapType === "tactical" ? TACTICAL_DARK_STYLES : undefined,
          // Mandatory usage attribution ID for Google Maps Platform compliance
          ...({ internalUsageAttributionIds: [GMP_ATTRIBUTION_ID] } as any),
        });

        mapRef.current = map;

        // Track zoom level changes for progressive geographic disclosure
        map.addListener("zoom_changed", () => {
          const z = map.getZoom();
          if (typeof z === "number") {
            setCurrentZoom(z);
          }
        });

        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn("Failed to load Google Maps 2D instance:", err);
        setLoadError(err?.message || "Failed to initialize Google Maps Platform");
        setLoading(false);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      window.removeEventListener("gmp-auth-failure", handleAuthFailure);
      // Clean up markers
      markersRef.current.forEach((m) => {
        if (m.setMap) m.setMap(null);
        if (m.map) m.map = null;
      });
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      polygonsRef.current.forEach((pg) => pg.setMap(null));
      polygonsRef.current = [];
    };
  }, []);

  // Update map type when user switches
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).google?.maps) return;

    if (mapType === "tactical") {
      map.setMapTypeId((window as any).google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: TACTICAL_DARK_STYLES });
    } else {
      map.setOptions({ styles: [] });
      map.setMapTypeId(
        mapType === "terrain"
          ? (window as any).google.maps.MapTypeId.TERRAIN
          : (window as any).google.maps.MapTypeId.HYBRID
      );
    }
  }, [mapType]);

  // Render Operational Layers (Boundaries, Rivers, Shelters, Hazard Zones, Incidents)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).google?.maps) return;

    const google = (window as any).google;

    // Clear previous overlays
    markersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      if (m.map) m.map = null;
    });
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    polygonsRef.current.forEach((pg) => pg.setMap(null));
    polygonsRef.current = [];

    // 1. Render Major Rivers
    if (layerVisibility.rivers && RIVER_PATHS) {
      RIVER_PATHS.forEach((river) => {
        const points = (river as any).points || (river as any).coordinates || [];
        const pathCoords = points.map(([lat, lng]: [number, number]) => ({
          lat,
          lng,
        }));

        const polyline = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: "#38bdf8",
          strokeOpacity: 0.85,
          strokeWeight: currentZoom >= 7 ? 3 : 2,
          map,
        });

        polylinesRef.current.push(polyline);
      });
    }

    // 5. Render Physiographic Mountain Systems & Landforms (Zoom >= 5.8)
    if (layerVisibility.terrain && currentZoom >= 5.5 && PHYSIOGRAPHIC_FEATURES) {
      PHYSIOGRAPHIC_FEATURES.forEach((feat) => {
        const marker = new google.maps.Marker({
          position: { lat: feat.coords[0], lng: feat.coords[1] },
          map,
          title: `${feat.name} (${feat.category}) - ${feat.elevationBadge || ""}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: "#38bdf8",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 1,
          },
        });
        markersRef.current.push(marker);
      });
    }

    // 6. Render Mountain Peaks, Passes & Strategic Dams (Zoom >= 7)
    if (layerVisibility.terrain && currentZoom >= 6.8) {
      if (MOUNTAIN_PEAKS_AND_PASSES) {
        MOUNTAIN_PEAKS_AND_PASSES.forEach((peak) => {
          const isPeak = peak.type === "PEAK";
          const marker = new google.maps.Marker({
            position: { lat: peak.coords[0], lng: peak.coords[1] },
            map,
            title: `${peak.name} [${peak.elevation}] - ${peak.state}`,
            icon: {
              path: isPeak ? "M 0,-5 L 5,5 L -5,5 Z" : "M -4,-2 L 4,-2 L 4,2 L -4,2 Z",
              scale: 3,
              fillColor: isPeak ? "#38bdf8" : "#f59e0b",
              fillOpacity: 0.9,
              strokeColor: "#ffffff",
              strokeWeight: 1,
            },
          });
          markersRef.current.push(marker);
        });
      }

      if (STRATEGIC_WATER_AND_DAMS) {
        STRATEGIC_WATER_AND_DAMS.forEach((dam) => {
          const marker = new google.maps.Marker({
            position: { lat: dam.coords[0], lng: dam.coords[1] },
            map,
            title: `${dam.name} (${dam.type}) - ${dam.spec}`,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 3,
              fillColor: "#06b6d4",
              fillOpacity: 0.9,
              strokeColor: "#ffffff",
              strokeWeight: 1,
            },
          });
          markersRef.current.push(marker);
        });
      }
    }

    // 7. Render State Hubs / Capitals
    if (layerVisibility.boundaries && STRATEGIC_DISTRICT_HUBS) {
      STRATEGIC_DISTRICT_HUBS.forEach((hub) => {
        const [lat, lng] = (hub as any).coords || [(hub as any).lat, (hub as any).lng];
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: `${hub.name} (${hub.state}) - ${hub.role}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 3.5,
            fillColor: "#ffffff",
            fillOpacity: 0.8,
            strokeColor: "#ff7a18",
            strokeWeight: 1.5,
          },
        });
        markersRef.current.push(marker);
      });
    }

    // 10. Render Incident Markers & Dynamic Hazard Buffers
    if (layerVisibility.incidents) {
      activeIncidents.forEach((inc) => {
        const isSelected = selectedIncidentId === inc.id;
        const isCritical = inc.severity === "CRITICAL";
        const isHigh = inc.severity === "HIGH";

        const markerColor = isCritical ? "#ef4444" : isHigh ? "#f59e0b" : "#06b6d4";

        // Tactical Custom HTML Marker for Incident
        const marker = new google.maps.Marker({
          position: { lat: inc.coordinates.lat, lng: inc.coordinates.lng },
          map,
          title: `${inc.eventCode}: ${inc.title}`,
          zIndex: isSelected ? 999 : isCritical ? 900 : 800,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 9 : 7,
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: {
            text: inc.eventCode.split("-")[1] || inc.eventCode,
            color: "#ffffff",
            fontSize: "10px",
            fontWeight: "bold",
            className: "tactical-map-label",
          },
        });

        marker.addListener("click", () => {
          setActiveIncident(inc);
          if (onSelectIncident) onSelectIncident(inc);
        });

        markersRef.current.push(marker);
      });
    }
  }, [
    activeIncidents,
    selectedIncidentId,
    layerVisibility,
    currentZoom,
    onSelectIncident,
  ]);

  // Pan to selected incident when prop changes
  useEffect(() => {
    if (!selectedIncidentId || !mapRef.current) return;
    const found = activeIncidents.find((i) => i.id === selectedIncidentId);
    if (found) {
      setActiveIncident(found);
      mapRef.current.panTo({
        lat: found.coordinates.lat,
        lng: found.coordinates.lng,
      });
      if (mapRef.current.getZoom()! < 8) {
        mapRef.current.setZoom(8);
      }
    }
  }, [selectedIncidentId, activeIncidents]);

  const handleZoomIn = () => {
    if (mapRef.current) {
      const z = mapRef.current.getZoom() || 5;
      mapRef.current.setZoom(z + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const z = mapRef.current.getZoom() || 5;
      mapRef.current.setZoom(z - 1);
    }
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: 22.5937, lng: 78.9629 });
      mapRef.current.setZoom(5);
    }
  };

  const jumpToPreset = (preset: (typeof GEO_PRESETS)[0]) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: preset.lat, lng: preset.lng });
      mapRef.current.setZoom(preset.zoom);
    }
  };

  const toggleLayer = (key: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className={`relative w-full h-full min-h-[440px] bg-isie-bg-deep overflow-hidden select-none font-mono ${className}`}
    >
      {/* 1. Underlying Google Maps Div Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 2. Loading State Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-isie-bg-deep/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 text-isie-cyan">
          <div className="w-8 h-8 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
          <span className="text-xs tracking-widest uppercase animate-pulse">
            SYNCHRONIZING GOOGLE MAPS PLATFORM...
          </span>
          <span className="text-[10px] text-isie-text-dim">
            INDIA OPERATIONAL THEATER // HYBRID TILES
          </span>
        </div>
      )}

      {/* 3. Error / Missing Key State */}
      {loadError && (
        <div className="absolute inset-0 bg-isie-bg-deep/95 z-30 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-isie-panel border border-amber-500/40 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="font-bold tracking-wider uppercase text-sm">
                Google Maps Key Required
              </span>
            </div>
            <p className="text-xs text-isie-text-secondary leading-relaxed">
              Google Maps Platform requires <strong>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</strong> with
              the <strong>Maps JavaScript API</strong> and <strong>Map Tiles API</strong> enabled.
            </p>
            {onFallbackToLeaflet && (
              <button
                onClick={onFallbackToLeaflet}
                className="w-full py-2 bg-isie-primary/20 hover:bg-isie-primary/30 border border-isie-primary text-white text-xs font-bold uppercase rounded-xs transition-colors"
              >
                SWITCH TO OFFLINE TACTICAL MAP
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Top-Left: Operational Header & Geographic Scale */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-isie-panel/90 backdrop-blur-md border border-white/10 rounded-xs shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-white tracking-wider uppercase">
            INDIA THEATER
          </span>
          <span className="text-isie-text-dim text-[11px]">|</span>
          <span className="text-[11px] text-isie-text-secondary uppercase">
            ZOOM LVL: {currentZoom.toFixed(1)}
          </span>
        </div>

        {/* Geographic Presets Quick Strip */}
        <div className="flex flex-wrap items-center gap-1 pointer-events-auto">
          {GEO_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => jumpToPreset(p)}
              className="px-2 py-0.5 bg-isie-bg-surface/80 hover:bg-white/10 border border-white/10 hover:border-isie-primary/50 text-[10px] text-isie-text-muted hover:text-white rounded-xs transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Top-Right: Map Style Selector & Action Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Basemap Quick Toggle: Satellite vs Street */}
        <BasemapQuickToggle
          basemap={currentBasemap}
          onChange={handleBasemapToggle}
        />

        {/* Style Selector */}
        <div className="hidden sm:inline-flex items-center p-0.5 bg-isie-panel/90 border border-white/10 rounded-xs backdrop-blur-md shadow-md text-[11px]">
          <button
            onClick={() => {
              setMapType("hybrid");
              handleBasemapToggle("satellite");
            }}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              mapType === "hybrid"
                ? "bg-isie-primary text-black font-bold"
                : "text-isie-text-muted hover:text-white"
            }`}
          >
            HYBRID
          </button>
          <button
            onClick={() => {
              setMapType("terrain");
              handleBasemapToggle("street");
            }}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              mapType === "terrain"
                ? "bg-isie-primary text-black font-bold"
                : "text-isie-text-muted hover:text-white"
            }`}
          >
            TERRAIN
          </button>
          <button
            onClick={() => {
              setMapType("tactical");
              handleBasemapToggle("street");
            }}
            className={`px-2.5 py-1 rounded-xs transition-colors ${
              mapType === "tactical"
                ? "bg-isie-cyan text-black font-bold"
                : "text-isie-text-muted hover:text-white"
            }`}
          >
            TACTICAL
          </button>
        </div>

        {/* Layers Drawer Toggle */}
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className={`p-1.5 rounded-xs border backdrop-blur-md transition-colors ${
            layersOpen
              ? "bg-isie-primary text-black border-isie-primary"
              : "bg-isie-panel/90 border-white/10 text-isie-text-muted hover:text-white hover:bg-white/10"
          }`}
          title="Operational Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 bg-isie-panel/90 border border-white/10 text-isie-text-muted hover:text-white hover:bg-white/10 rounded-xs backdrop-blur-md transition-colors"
            title={isFullscreen ? "Restore View" : "Maximize Map"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 6. Layers Drawer Flyout */}
      {layersOpen && (
        <div className="absolute top-14 right-3 z-30 w-56 p-3.5 bg-isie-panel/95 backdrop-blur-md border border-white/15 rounded-sm shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white uppercase text-[11px]">OPERATIONAL LAYERS</span>
            <button
              onClick={() => setLayersOpen(false)}
              className="text-isie-text-dim hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-xs hover:bg-white/5">
              <span className="text-isie-text-secondary">Boundaries & Districts</span>
              <input
                type="checkbox"
                checked={layerVisibility.boundaries}
                onChange={() => toggleLayer("boundaries")}
                className="accent-isie-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-xs hover:bg-white/5">
              <span className="text-isie-text-secondary">Rivers & Basins</span>
              <input
                type="checkbox"
                checked={layerVisibility.rivers}
                onChange={() => toggleLayer("rivers")}
                className="accent-isie-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-xs hover:bg-white/5">
              <span className="text-isie-text-secondary">Terrain Relief</span>
              <input
                type="checkbox"
                checked={layerVisibility.terrain}
                onChange={() => toggleLayer("terrain")}
                className="accent-isie-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-xs hover:bg-white/5">
              <span className="text-isie-text-secondary">Active Incidents</span>
              <input
                type="checkbox"
                checked={layerVisibility.incidents}
                onChange={() => toggleLayer("incidents")}
                className="accent-isie-primary"
              />
            </label>

            <p className="px-1.5 py-1 text-[10px] leading-relaxed text-amber-400">
              Hazard, route, and shelter overlays are unavailable until a source provider is connected.
            </p>
          </div>
        </div>
      )}

      {/* 7. Bottom-Right Navigation / Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-white rounded-xs flex items-center justify-center transition-colors shadow-lg"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-white rounded-xs flex items-center justify-center transition-colors shadow-lg"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="w-8 h-8 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-isie-cyan rounded-xs flex items-center justify-center transition-colors shadow-lg"
          title="Reset to India Center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 8. Bottom-Left: Selected Incident Dossier Overlay */}
      {activeIncident && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full p-4 bg-isie-panel/95 backdrop-blur-md border border-white/15 rounded-sm shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{activeIncident.eventCode}</span>
              <TacticalBadge
                variant={
                  activeIncident.severity === "CRITICAL"
                    ? "critical"
                    : activeIncident.severity === "HIGH"
                    ? "warning"
                    : "cyan"
                }
                size="sm"
              >
                {activeIncident.severity}
              </TacticalBadge>
            </div>
            <button
              onClick={() => setActiveIncident(null)}
              className="text-isie-text-dim hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="font-bold text-white text-[13px] leading-tight">
            {activeIncident.title}
          </h4>

          <div className="text-[11px] text-isie-text-secondary flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-isie-cyan shrink-0" />
            <span className="truncate">{activeIncident.locationName}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
            <div>
              <span className="text-isie-text-dim block">POPULATION AT RISK</span>
              <span className="text-amber-300 font-bold">
                {activeIncident.populationAtRisk.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-isie-text-dim block">RELOCATION INDEX</span>
              <span className="text-isie-primary font-bold">{activeIncident.relocationScore} / 100</span>
            </div>
          </div>

          <p className="text-[11px] text-isie-text-dim line-clamp-2 leading-relaxed">
            {activeIncident.summary}
          </p>
        </div>
      )}

      {/* Mandatory Attribution Notice for Google Maps Platform */}
      <div className="absolute bottom-1 left-3 z-10 text-[9px] text-isie-text-dim/60 pointer-events-none font-mono">
        Google Maps Platform // India National Operational Picture
      </div>
    </div>
  );
};
