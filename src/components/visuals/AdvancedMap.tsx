"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Eye,
  Crosshair,
  MapPin,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Radio,
  Navigation,
  Shield,
  Activity,
  X,
  Compass,
  Mountain,
  Waves,
  Map as MapIcon,
  ChevronRight,
  Info,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { IntelligenceEvent } from "@/lib/types/isie";
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
import { GoogleMap2DView } from "./GoogleMap2DView";
import { isGoogleMapsConfigured } from "@/lib/services/googleMapsLoader";
import { BasemapQuickToggle, BasemapMode } from "./BasemapQuickToggle";

export const STREET_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export interface AdvancedMapProps {
  className?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IntelligenceEvent | null) => void;
  incidents?: IntelligenceEvent[];
  defaultToGoogleMaps?: boolean;
  basemap?: BasemapMode;
  onBasemapChange?: (mode: BasemapMode) => void;
  activeLayers?: Record<string, boolean>;
  layerOpacities?: Record<string, number>;
}

export const AdvancedMap: React.FC<AdvancedMapProps> = ({
  className = "",
  onToggleFullscreen,
  isFullscreen = false,
  selectedIncidentId = null,
  onSelectIncident,
  incidents,
  defaultToGoogleMaps = false,
  basemap: propBasemap,
  onBasemapChange,
  activeLayers: propActiveLayers,
  layerOpacities: propLayerOpacities,
}) => {
  const activeIncidents = incidents ?? [];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersGroupRef = useRef<Record<string, any>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<IntelligenceEvent | null>(null);
  const [mapStyle, setMapStyle] = useState<"TACTICAL" | "NATURAL">("TACTICAL");
  const [currentZoom, setCurrentZoom] = useState<number>(5.0);
  const [useGoogleMaps, setUseGoogleMaps] = useState<boolean>(defaultToGoogleMaps);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapMode>(propBasemap || "street");

  // Dynamically apply activeLayers and layerOpacities to Leaflet map layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;
    const groups = layersGroupRef.current;

    const updateGroupStyle = (
      group: any,
      opacity: number,
      visible: boolean,
      fillRatio = 0.25
    ) => {
      if (!group) return;
      if (!visible || opacity <= 0.01) {
        if (map.hasLayer(group)) map.removeLayer(group);
        return;
      }
      if (!map.hasLayer(group)) {
        map.addLayer(group);
      }

      if (typeof group.eachLayer === "function") {
        group.eachLayer((layer: any) => {
          if (typeof layer.setStyle === "function") {
            layer.setStyle({
              opacity: opacity,
              fillOpacity: Math.min(1, opacity * fillRatio),
            });
          } else if (typeof layer.setOpacity === "function") {
            layer.setOpacity(opacity);
          }
        });
      }
    };

    if (propLayerOpacities || propActiveLayers) {
      const popOpacity = propLayerOpacities?.["layer-population-density"] ?? 0.5;
      const popVisible = propActiveLayers ? propActiveLayers["layer-population-density"] !== false : true;
      updateGroupStyle(groups.fullStateNames, popOpacity, popVisible, 0);
      updateGroupStyle(groups.stateCodes, popOpacity, popVisible, 0);
    }
  }, [propActiveLayers, propLayerOpacities, mapLoaded]);

  // Keep internal state in sync if prop changes
  useEffect(() => {
    if (propBasemap && propBasemap !== currentBasemap) {
      setCurrentBasemap(propBasemap);
      const tileLayer = layersGroupRef.current.baseMap;
      if (tileLayer && typeof tileLayer.setUrl === "function") {
        tileLayer.setUrl(propBasemap === "satellite" ? SATELLITE_TILE_URL : STREET_TILE_URL);
      }
    }
  }, [propBasemap]);

  const handleBasemapChange = (mode: BasemapMode) => {
    setCurrentBasemap(mode);
    onBasemapChange?.(mode);
    const tileLayer = layersGroupRef.current.baseMap;
    if (tileLayer && typeof tileLayer.setUrl === "function") {
      tileLayer.setUrl(mode === "satellite" ? SATELLITE_TILE_URL : STREET_TILE_URL);
    }
  };

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setUseGoogleMaps(false);
    } else {
      setUseGoogleMaps(defaultToGoogleMaps);
    }
  }, [defaultToGoogleMaps]);

  // Default Layer Toggles
  const [layerVisibility, setLayerVisibility] = useState({
    baseMap: true,
    stateBoundaries: true,
    rivers: true,
    terrain: true,
    hazardZones: false,
    evacuationCorridors: false,
    incidents: true,
    shelters: false,
  });

  const updateZoomDependentLayers = useCallback((zoom: number, visibility = layerVisibility) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setCurrentZoom(zoom);
    const groups = layersGroupRef.current;

    // 1. State Boundaries & State Names progressive reveal
    // Zoom < 5.8: 2-Letter Codes
    // Zoom >= 5.8: Full State Names and Capitals
    if (visibility.stateBoundaries) {
      if (zoom < 5.8) {
        if (groups.stateCodes && !map.hasLayer(groups.stateCodes)) map.addLayer(groups.stateCodes);
        if (groups.fullStateNames && map.hasLayer(groups.fullStateNames)) map.removeLayer(groups.fullStateNames);
        if (groups.stateCapitals && map.hasLayer(groups.stateCapitals)) map.removeLayer(groups.stateCapitals);
      } else {
        if (groups.stateCodes && map.hasLayer(groups.stateCodes)) map.removeLayer(groups.stateCodes);
        if (groups.fullStateNames && !map.hasLayer(groups.fullStateNames)) map.addLayer(groups.fullStateNames);
        if (groups.stateCapitals && !map.hasLayer(groups.stateCapitals)) map.addLayer(groups.stateCapitals);
      }
    } else {
      if (groups.stateCodes && map.hasLayer(groups.stateCodes)) map.removeLayer(groups.stateCodes);
      if (groups.fullStateNames && map.hasLayer(groups.fullStateNames)) map.removeLayer(groups.fullStateNames);
      if (groups.stateCapitals && map.hasLayer(groups.stateCapitals)) map.removeLayer(groups.stateCapitals);
    }

    // 2. Terrain & Physiographic Geographic Features
    // Zoom >= 5.8: Physiographic Landforms (Himalayan Arc, Indo-Gangetic Plain, Deccan Plateau, Ghats)
    // Zoom >= 7.2: Peaks & Passes, Strategic Dams & Water Bodies, District Centers
    if (visibility.terrain) {
      if (groups.terrainBase && !map.hasLayer(groups.terrainBase)) map.addLayer(groups.terrainBase);

      if (zoom >= 5.8) {
        if (groups.physiographic && !map.hasLayer(groups.physiographic)) map.addLayer(groups.physiographic);
      } else {
        if (groups.physiographic && map.hasLayer(groups.physiographic)) map.removeLayer(groups.physiographic);
      }

      if (zoom >= 7.2) {
        if (groups.mountainPeaks && !map.hasLayer(groups.mountainPeaks)) map.addLayer(groups.mountainPeaks);
        if (groups.waterAndDams && !map.hasLayer(groups.waterAndDams)) map.addLayer(groups.waterAndDams);
        if (groups.districtHubs && !map.hasLayer(groups.districtHubs)) map.addLayer(groups.districtHubs);
      } else {
        if (groups.mountainPeaks && map.hasLayer(groups.mountainPeaks)) map.removeLayer(groups.mountainPeaks);
        if (groups.waterAndDams && map.hasLayer(groups.waterAndDams)) map.removeLayer(groups.waterAndDams);
        if (groups.districtHubs && map.hasLayer(groups.districtHubs)) map.removeLayer(groups.districtHubs);
      }
    } else {
      if (groups.terrainBase && map.hasLayer(groups.terrainBase)) map.removeLayer(groups.terrainBase);
      if (groups.physiographic && map.hasLayer(groups.physiographic)) map.removeLayer(groups.physiographic);
      if (groups.mountainPeaks && map.hasLayer(groups.mountainPeaks)) map.removeLayer(groups.mountainPeaks);
      if (groups.waterAndDams && map.hasLayer(groups.waterAndDams)) map.removeLayer(groups.waterAndDams);
      if (groups.districtHubs && map.hasLayer(groups.districtHubs)) map.removeLayer(groups.districtHubs);
    }

    // 3. Rivers & Hydrological Labels
    // Zoom >= 5.8: River names along paths with flow direction
    if (visibility.rivers) {
      if (groups.rivers && !map.hasLayer(groups.rivers)) map.addLayer(groups.rivers);
      if (zoom >= 5.8) {
        if (groups.riverLabels && !map.hasLayer(groups.riverLabels)) map.addLayer(groups.riverLabels);
      } else {
        if (groups.riverLabels && map.hasLayer(groups.riverLabels)) map.removeLayer(groups.riverLabels);
      }
    } else {
      if (groups.rivers && map.hasLayer(groups.rivers)) map.removeLayer(groups.rivers);
      if (groups.riverLabels && map.hasLayer(groups.riverLabels)) map.removeLayer(groups.riverLabels);
    }
  }, [layerVisibility]);

  const toggleLayer = (key: keyof typeof layerVisibility) => {
    if (key === "hazardZones" || key === "evacuationCorridors" || key === "shelters") return;
    setLayerVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const map = mapInstanceRef.current;
      if (!map) return next;

      // For single groups
      if (key === "baseMap") {
        const group = layersGroupRef.current.baseMap;
        if (group) {
          if (next.baseMap) map.addLayer(group);
          else map.removeLayer(group);
        }
      } else if (key === "incidents") {
        const group = layersGroupRef.current.incidents;
        if (group) {
          if (next.incidents) map.addLayer(group);
          else map.removeLayer(group);
        }
      }

      // Re-evaluate zoom-dependent tiers
      setTimeout(() => {
        updateZoomDependentLayers(map.getZoom(), next);
      }, 10);

      return next;
    });
  };

  const selectIncident = useCallback(
    (inc: IntelligenceEvent | null) => {
      setActiveIncident(inc);
      if (onSelectIncident) onSelectIncident(inc);
      if (inc && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([inc.coordinates.lat, inc.coordinates.lng], 8, {
          duration: 1.2,
        });
      }
    },
    [onSelectIncident]
  );

  const resetIndiaView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.5, 78.9], 5, { duration: 1.0 });
      setActiveIncident(null);
      if (onSelectIncident) onSelectIncident(null);
    }
  }, [onSelectIncident]);

  // Sync external selected incident
  useEffect(() => {
    if (selectedIncidentId) {
      const inc = activeIncidents.find((i) => i.id === selectedIncidentId);
      if (inc) {
        selectIncident(inc);
      }
    }
  }, [selectedIncidentId, selectIncident, activeIncidents]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isCancelled = false;

    async function initLeaflet() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      if (isCancelled || !mapContainerRef.current) return;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map centered around India [22.5, 78.9] at zoom 5
      const map = L.map(mapContainerRef.current, {
        center: [22.5, 78.9],
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // --- 1. Authentic OpenStreetMap / Satellite Basemap ---
      const initialTileUrl = currentBasemap === "satellite" ? SATELLITE_TILE_URL : STREET_TILE_URL;
      const baseTileLayer = L.tileLayer(
        initialTileUrl,
        {
          maxZoom: 19,
          attribution:
            currentBasemap === "satellite"
              ? '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ).addTo(map);

      layersGroupRef.current.baseMap = baseTileLayer;

      // --- 2. Terrain Base (Polygons, Borders & Water Bodies) ---
      const terrainBaseGroup = L.layerGroup().addTo(map);
      layersGroupRef.current.terrainBase = terrainBaseGroup;

      // Himalayan Relief Arc
      const himalayanArc = L.polygon(
        [
          [35.5, 74.0], [35.8, 77.5], [34.5, 79.2], [31.5, 79.8],
          [30.2, 81.0], [28.0, 88.5], [28.5, 94.5], [29.0, 96.0],
          [27.5, 95.0], [27.0, 89.0], [29.0, 81.5], [32.0, 76.5],
        ],
        {
          color: "#38bdf8",
          weight: 1,
          opacity: 0.35,
          fillColor: "#0284c7",
          fillOpacity: 0.06,
          dashArray: "4, 4",
        }
      ).bindTooltip("Himalayan High Relief Arc // Glacial Watershed", {
        className: "tactical-tooltip",
        sticky: true,
      });
      terrainBaseGroup.addLayer(himalayanArc);

      // Thar Arid Basin
      const tharBasin = L.polygon(
        [
          [28.5, 70.0], [28.8, 73.5], [25.5, 73.0], [24.0, 71.5],
          [23.5, 68.5], [24.5, 68.5], [26.5, 69.5],
        ],
        {
          color: "#f59e0b",
          weight: 1,
          opacity: 0.3,
          fillColor: "#d97706",
          fillOpacity: 0.05,
          dashArray: "3, 3",
        }
      ).bindTooltip("Thar Arid Basin // High Heat & Drought Matrix", {
        className: "tactical-tooltip",
        sticky: true,
      });
      terrainBaseGroup.addLayer(tharBasin);

      // Neighbouring Countries Strategic Context Markers
      NEIGHBOURING_COUNTRIES.forEach((c) => {
        const countryIcon = L.divIcon({
          className: "tactical-marker-clean",
          html: `<div class="font-mono text-[9px] text-slate-400/80 tracking-widest font-bold uppercase pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] border border-slate-600/30 px-1.5 py-0.5 rounded-xs bg-[#05070e]/80 backdrop-blur-xs whitespace-nowrap">${c.name}</div>`,
          iconSize: [84, 18],
          iconAnchor: [42, 9],
        });
        const marker = L.marker(c.coords, { icon: countryIcon, interactive: false });
        terrainBaseGroup.addLayer(marker);
      });

      // Major Oceanic Water Body Markers
      MAJOR_WATER_BODIES.forEach((w) => {
        const waterIcon = L.divIcon({
          className: "tactical-marker-clean",
          html: `<div class="font-mono text-[10px] text-sky-400/60 tracking-[0.25em] font-semibold italic pointer-events-none whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">${w.name}</div>`,
          iconSize: [120, 20],
          iconAnchor: [60, 10],
        });
        const marker = L.marker(w.coords, { icon: waterIcon, interactive: false });
        terrainBaseGroup.addLayer(marker);
      });

      // --- 3. PROGRESSIVE GEOGRAPHIC FEATURES (Zoom >= 5.8) ---
      const physiographicGroup = L.layerGroup();
      layersGroupRef.current.physiographic = physiographicGroup;

      PHYSIOGRAPHIC_FEATURES.forEach((feat) => {
        const isMountain = feat.category === "MOUNTAIN_SYSTEM";
        const isDesert = feat.category === "DESERT";
        const isCoastal = feat.category === "COASTAL" || feat.category === "DELTA";
        const colorClass = isMountain
          ? "border-sky-500/40 text-sky-300 bg-sky-950/70"
          : isDesert
          ? "border-amber-500/40 text-amber-300 bg-amber-950/70"
          : isCoastal
          ? "border-teal-500/40 text-teal-300 bg-teal-950/70"
          : "border-indigo-500/40 text-indigo-300 bg-indigo-950/70";

        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="pointer-events-auto cursor-pointer group flex flex-col items-center">
              <div class="flex items-center gap-1 px-2 py-0.5 rounded-xs border text-[9px] font-mono font-semibold tracking-wider backdrop-blur-md shadow-lg ${colorClass} transition-transform group-hover:scale-105">
                <span class="w-1.5 h-1.5 rounded-full ${isMountain ? "bg-sky-400" : isDesert ? "bg-amber-400" : "bg-teal-400"} animate-pulse"></span>
                <span class="whitespace-nowrap uppercase">${feat.name}</span>
                ${feat.elevationBadge ? `<span class="opacity-70 text-[8px]">(${feat.elevationBadge})</span>` : ""}
              </div>
            </div>
          `,
          iconSize: [160, 24],
          iconAnchor: [80, 12],
        });

        const marker = L.marker(feat.coords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100 max-w-xs">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-2 h-2 rounded-full ${isMountain ? "bg-sky-400" : isDesert ? "bg-amber-400" : "bg-teal-400"}"></span>
              <span class="font-bold text-white uppercase">${feat.name}</span>
            </div>
            <div class="text-[10px] text-sky-400 mb-1 font-semibold">${feat.category} // ELEV: ${feat.elevationBadge || "VARIABLE"}</div>
            <div class="text-[10px] text-slate-300 leading-relaxed">${feat.description}</div>
          </div>
        `);
        physiographicGroup.addLayer(marker);
      });

      // --- 4. PROGRESSIVE MOUNTAIN PEAKS & PASSES (Zoom >= 7.2) ---
      const mountainPeaksGroup = L.layerGroup();
      layersGroupRef.current.mountainPeaks = mountainPeaksGroup;

      MOUNTAIN_PEAKS_AND_PASSES.forEach((peak) => {
        const isPeak = peak.type === "PEAK";
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="cursor-pointer group flex items-center gap-1 bg-[#05070e]/90 border border-slate-400/50 px-1.5 py-0.5 rounded-xs shadow-md backdrop-blur-xs hover:border-sky-400">
              <span class="text-[9px] ${isPeak ? "text-sky-400 font-bold" : "text-amber-400"}">${isPeak ? "▲" : "☲"}</span>
              <span class="font-mono text-[9px] font-semibold text-slate-200 whitespace-nowrap">${peak.name}</span>
              <span class="font-mono text-[8px] text-sky-400/90 font-mono">${peak.elevation}</span>
            </div>
          `,
          iconSize: [130, 20],
          iconAnchor: [65, 10],
        });

        const marker = L.marker(peak.coords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-sky-400 font-bold">${isPeak ? "▲ PEAK" : "☲ MOUNTAIN PASS"}</span>
              <span class="font-bold text-white">${peak.name}</span>
            </div>
            <div class="text-[10px] text-emerald-400 mb-0.5">ELEVATION: ${peak.elevation} (${peak.state})</div>
            <div class="text-[10px] text-slate-300 leading-snug">${peak.strategicNote}</div>
          </div>
        `);
        mountainPeaksGroup.addLayer(marker);
      });

      // --- 5. PROGRESSIVE STRATEGIC DAMS, RESERVOIRS & LAGOONS (Zoom >= 7.2) ---
      const waterAndDamsGroup = L.layerGroup();
      layersGroupRef.current.waterAndDams = waterAndDamsGroup;

      STRATEGIC_WATER_AND_DAMS.forEach((item) => {
        const isDam = item.type === "DAM";
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="cursor-pointer group flex items-center gap-1 bg-[#050811]/90 border ${isDam ? "border-cyan-500/60" : "border-blue-400/50"} px-1.5 py-0.5 rounded-xs shadow-md backdrop-blur-xs hover:scale-105 transition-transform">
              <span class="w-1.5 h-1.5 rounded-xs ${isDam ? "bg-cyan-400" : "bg-blue-400"}"></span>
              <span class="font-mono text-[9px] font-bold ${isDam ? "text-cyan-200" : "text-blue-200"} whitespace-nowrap">${item.name}</span>
            </div>
          `,
          iconSize: [140, 20],
          iconAnchor: [70, 10],
        });

        const marker = L.marker(item.coords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100">
            <div class="font-bold text-cyan-400 mb-1">${item.name}</div>
            <div class="text-[10px] text-slate-300">${item.riverOrCoast}</div>
            <div class="text-[10px] text-cyan-300 mt-1">${item.spec}</div>
            <div class="text-[9px] text-slate-400 mt-1 font-semibold uppercase">FACILITY TYPE: ${item.type}</div>
          </div>
        `);
        waterAndDamsGroup.addLayer(marker);
      });

      // --- 6. PROGRESSIVE STRATEGIC DISTRICT CENTERS (Zoom >= 7.2) ---
      const districtHubsGroup = L.layerGroup();
      layersGroupRef.current.districtHubs = districtHubsGroup;

      STRATEGIC_DISTRICT_HUBS.forEach((dist) => {
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="cursor-pointer flex items-center gap-1 bg-[#05070e]/95 border border-amber-500/40 px-1.5 py-0.5 rounded-xs shadow-md backdrop-blur-xs">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span class="font-mono text-[9px] font-bold text-slate-100 whitespace-nowrap">${dist.name}</span>
            </div>
          `,
          iconSize: [120, 20],
          iconAnchor: [60, 10],
        });

        const marker = L.marker(dist.coords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100">
            <div class="font-bold text-amber-400 mb-0.5">${dist.name}</div>
            <div class="text-[10px] text-slate-300 mb-1">DISTRICT: ${dist.district} (${dist.state})</div>
            <div class="text-[10px] text-emerald-400">ROLE: ${dist.role}</div>
          </div>
        `);
        districtHubsGroup.addLayer(marker);
      });

      // --- 7. INDIAN STATES: PROGRESSIVE STATE LABELS ---
      // Tier 1 (Zoom < 5.8): Compact 2-letter codes
      const stateCodesGroup = L.layerGroup().addTo(map);
      layersGroupRef.current.stateCodes = stateCodesGroup;

      INDIAN_STATES.forEach((st) => {
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `<div class="font-mono text-[9px] text-slate-400/80 tracking-wider font-semibold pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] border border-slate-700/30 px-1 py-0.2 rounded-xs bg-[#05070e]/60">${st.code}</div>`,
          iconSize: [28, 16],
          iconAnchor: [14, 8],
        });
        const marker = L.marker(st.coords, { icon, interactive: false });
        stateCodesGroup.addLayer(marker);
      });

      // Tier 2 (Zoom >= 5.8): Full Indian State Names Progressively Revealed
      const fullStateNamesGroup = L.layerGroup();
      layersGroupRef.current.fullStateNames = fullStateNamesGroup;

      INDIAN_STATES.forEach((st) => {
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="cursor-pointer group flex flex-col items-center">
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-xs border border-sky-400/40 bg-[#05070e]/95 text-sky-200 text-[10px] font-mono font-bold tracking-wider shadow-lg backdrop-blur-md group-hover:border-cyan-300 group-hover:text-white transition-all">
                <span class="w-1.5 h-1.5 rounded-xs bg-sky-400"></span>
                <span class="whitespace-nowrap uppercase">${st.name}</span>
                <span class="text-[9px] font-normal text-sky-400/70 border-l border-sky-500/30 pl-1">${st.code}</span>
              </div>
            </div>
          `,
          iconSize: [160, 24],
          iconAnchor: [80, 12],
        });

        const marker = L.marker(st.coords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100">
            <div class="font-bold text-sky-400 mb-0.5">${st.name} [${st.code}]</div>
            <div class="text-[10px] text-slate-300">ADMIN CAPITAL: <strong class="text-white">${st.capital}</strong></div>
            <div class="text-[10px] text-slate-400 mt-1">SECTOR ZONE: ${st.region} Operational Command</div>
          </div>
        `);
        fullStateNamesGroup.addLayer(marker);
      });

      // State Capitals Markers (Zoom >= 5.8)
      const stateCapitalsGroup = L.layerGroup();
      layersGroupRef.current.stateCapitals = stateCapitalsGroup;

      INDIAN_STATES.forEach((st) => {
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="cursor-pointer flex items-center gap-1 bg-[#080d1a]/90 border border-slate-500/40 px-1.5 py-0.5 rounded-xs shadow-md">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span class="font-mono text-[9px] text-slate-200 font-semibold whitespace-nowrap">${st.capital}</span>
            </div>
          `,
          iconSize: [120, 18],
          iconAnchor: [60, 9],
        });

        const marker = L.marker(st.capitalCoords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100">
            <div class="font-bold text-cyan-400">${st.capital}</div>
            <div class="text-[10px] text-slate-300">STATE CAPITAL // ${st.name}</div>
          </div>
        `);
        stateCapitalsGroup.addLayer(marker);
      });

      // --- 8. RIVERS & HYDROLOGICAL PROGRESSIVE LABELS ---
      const riversGroup = L.layerGroup().addTo(map);
      layersGroupRef.current.rivers = riversGroup;

      RIVER_PATHS.forEach((river) => {
        const polyline = L.polyline(river.points, {
          color: "#00f2fe",
          weight: 2,
          opacity: 0.75,
          dashArray: "4, 2",
        }).bindTooltip(`${river.name} // ${river.basin}`, {
          className: "tactical-tooltip",
          sticky: true,
        });
        riversGroup.addLayer(polyline);
      });

      // River Labels along river corridors (Zoom >= 5.8)
      const riverLabelsGroup = L.layerGroup();
      layersGroupRef.current.riverLabels = riverLabelsGroup;

      RIVER_PATHS.forEach((river) => {
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="pointer-events-none flex items-center gap-1 font-mono text-[9px] text-cyan-300/90 font-bold bg-[#040814]/85 border border-cyan-500/30 px-1.5 py-0.5 rounded-xs drop-shadow-md whitespace-nowrap">
              <span>≈ ${river.name}</span>
              <span class="text-[8px] text-cyan-400/60">${river.flowDirection}</span>
            </div>
          `,
          iconSize: [140, 20],
          iconAnchor: [70, 10],
        });
        const marker = L.marker(river.labelCoord, { icon, interactive: false });
        riverLabelsGroup.addLayer(marker);
      });

      // --- 9. HAZARD ZONES LAYER ---
      const hazardGroup = L.layerGroup();
      layersGroupRef.current.hazardZones = hazardGroup;

      // Authoritative Hazard Polygons
      AUTHORITATIVE_HAZARD_ZONES.forEach((zone) => {
        const isRed = zone.classification === "RED_ZONE";
        const strokeCol = isRed ? "#ef4444" : "#f59e0b";
        const fillCol = isRed ? "#dc2626" : "#d97706";

        const polygon = L.polygon(zone.polygon, {
          color: strokeCol,
          weight: 2,
          opacity: 0.9,
          fillColor: fillCol,
          fillOpacity: 0.25,
          dashArray: isRed ? "5, 3" : "4, 4",
        }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100 max-w-xs">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-2 h-2 rounded-full ${isRed ? "bg-red-500 animate-ping" : "bg-amber-500"}"></span>
              <span class="font-bold text-white uppercase">${zone.name}</span>
            </div>
            <div class="text-[10px] ${isRed ? "text-red-400 font-bold" : "text-amber-400"} mb-1">${zone.classification} // ${zone.hazardType}</div>
            <div class="text-[10px] text-slate-300 leading-snug mb-2">${zone.description}</div>
            <div class="border-t border-white/10 pt-1 text-[10px] flex justify-between">
              <span class="text-slate-400">EXPOSED POP:</span>
              <span class="text-amber-300 font-bold">${zone.populationExposed.toLocaleString()}</span>
            </div>
          </div>
        `);
        hazardGroup.addLayer(polygon);
      });

      // Dynamic Circular Hazard Swaths
      // Chamoli GLOF Inundation Buffer
      const chamoliHazard = L.circle([30.5541, 79.5663], {
        radius: 35000,
        color: "#ef4444",
        weight: 1.5,
        opacity: 0.85,
        fillColor: "#ef4444",
        fillOpacity: 0.15,
        dashArray: "4, 4",
      }).bindTooltip("GLOF RED ZONE: Chamoli / Dhauliganga Watershed", {
        className: "tactical-tooltip",
        sticky: true,
      });
      hazardGroup.addLayer(chamoliHazard);

      // Bay of Bengal Cyclone Varun Storm Surge Inundation Swath
      const cycloneHazard = L.circle([19.8135, 85.8312], {
        radius: 65000,
        color: "#ef4444",
        weight: 1.5,
        opacity: 0.85,
        fillColor: "#ef4444",
        fillOpacity: 0.18,
        dashArray: "4, 4",
      }).bindTooltip("CYCLONE RED ZONE: Odisha-Andhra Surge Swath", {
        className: "tactical-tooltip",
        sticky: true,
      });
      hazardGroup.addLayer(cycloneHazard);

      // Brahmaputra Flood Plain Surcharge Swath
      const assamHazard = L.circle([26.6854, 93.3512], {
        radius: 45000,
        color: "#f59e0b",
        weight: 1.5,
        opacity: 0.8,
        fillColor: "#f59e0b",
        fillOpacity: 0.15,
        dashArray: "4, 3",
      }).bindTooltip("WARNING ZONE: Brahmaputra Embankment Breach", {
        className: "tactical-tooltip",
        sticky: true,
      });
      hazardGroup.addLayer(assamHazard);

      // --- 9B. CRITICAL EVACUATION CORRIDORS & ROAD CUTOFFS ---
      const evacuationGroup = L.layerGroup();
      layersGroupRef.current.evacuationCorridors = evacuationGroup;

      CRITICAL_EVACUATION_CORRIDORS.forEach((corridor) => {
        const isOpen = corridor.status === "OPEN";
        const isSevered = corridor.status === "SEVERED";
        const col = isSevered ? "#ef4444" : isOpen ? "#10b981" : "#f59e0b";

        const line = L.polyline(corridor.points, {
          color: col,
          weight: 3.5,
          opacity: 0.9,
          dashArray: isSevered ? "6, 4" : isOpen ? "8, 3" : "4, 4",
        }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100 max-w-xs">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-2 h-2 rounded-full" style="background-color: ${col}"></span>
              <span class="font-bold text-white">${corridor.name}</span>
            </div>
            <div class="text-[10px] font-bold mb-1" style="color: ${col}">STATUS: ${corridor.status} [${corridor.highwayRef}]</div>
            <div class="text-[10px] text-slate-300 leading-snug mb-1">${corridor.clearanceNote}</div>
            ${corridor.bottlenecks?.length ? `
              <div class="text-[9px] text-amber-300/90 border-t border-white/10 pt-1 mt-1">
                <strong>BOTTLENECK:</strong> ${corridor.bottlenecks.join("; ")}
              </div>
            ` : ""}
          </div>
        `);
        evacuationGroup.addLayer(line);
      });

      // Road Cutoff Chokepoints
      const cutoffsGroup = L.layerGroup();
      layersGroupRef.current.roadCutoffs = cutoffsGroup;

      ROAD_CUTOFF_CHOKEPOINTS.forEach((cutoff) => {
        const isSevered = cutoff.status === "SEVERED";
        const icon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="flex items-center gap-1 bg-[#05070e]/95 border ${isSevered ? "border-red-500 text-red-400" : "border-amber-500 text-amber-400"} px-1.5 py-0.5 rounded-xs shadow-lg backdrop-blur-md cursor-pointer hover:scale-110 transition-transform">
              <span class="text-[9px] font-bold">${isSevered ? "✕" : "⚠"}</span>
              <span class="font-mono text-[8px] font-bold tracking-wider uppercase whitespace-nowrap">${cutoff.highwayRef}</span>
            </div>
          `,
          iconSize: [60, 18],
          iconAnchor: [30, 9],
        });

        const marker = L.marker(cutoff.coords, { icon }).bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100 max-w-xs">
            <div class="font-bold text-red-400 mb-0.5">ROAD CUTOFF // ${cutoff.highwayRef}</div>
            <div class="font-semibold text-white mb-1">${cutoff.name}</div>
            <div class="text-[10px] text-slate-300 leading-snug">${cutoff.description}</div>
            <div class="text-[9px] text-red-400 mt-1 font-bold">STATE: ARTERIAL TRAFFIC DISRUPTED</div>
          </div>
        `);
        cutoffsGroup.addLayer(marker);
      });

      // --- 10. TACTICAL SHELTERS LAYER ---
      const sheltersGroup = L.layerGroup();
      layersGroupRef.current.shelters = sheltersGroup;

      SAFE_SHELTERS.forEach((shelter) => {
        const shelterIcon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="flex items-center gap-1 bg-[#050811]/90 border border-cyan-400 px-1.5 py-0.5 rounded-xs shadow-md">
              <span class="w-1.5 h-1.5 rounded-xs bg-cyan-400"></span>
              <span class="font-mono text-[9px] text-cyan-300 font-bold whitespace-nowrap">${shelter.name.split(" ")[0]}</span>
            </div>
          `,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        });

        const shelterMarker = L.marker(shelter.coords, { icon: shelterIcon })
          .bindPopup(`
            <div class="font-mono text-xs p-1 text-slate-100">
              <div class="font-bold text-cyan-400">${shelter.name}</div>
              <div class="text-[10px] text-slate-300 mt-1">CAPACITY: ${shelter.capacity}</div>
              <div class="text-[10px] text-cyan-300 mt-0.5">RADIO FREQ: ${shelter.radioFreq}</div>
              <div class="text-[10px] text-amber-300 mt-0.5">DEMO RECORD · NOT VERIFIED</div>
            </div>
          `);
        sheltersGroup.addLayer(shelterMarker);
      });

      // --- 11. ISIE CRISIS INCIDENTS LAYER ---
      const incidentsGroup = L.layerGroup().addTo(map);
      layersGroupRef.current.incidents = incidentsGroup;

      activeIncidents.forEach((inc) => {
        const isCritical = inc.severity === "CRITICAL";
        const isHigh = inc.severity === "HIGH";
        const col = isCritical ? "#ef4444" : isHigh ? "#f59e0b" : "#38bdf8";

        const incidentIcon = L.divIcon({
          className: "tactical-marker-clean",
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              ${isCritical ? `<div class="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping"></div>` : ""}
              <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${col}">
                <div class="w-1 h-1 rounded-full bg-white"></div>
              </div>
              <div class="absolute left-5 bg-[#05070e]/95 border px-1.5 py-0.5 rounded-xs font-mono text-[9px] font-bold text-white whitespace-nowrap shadow-xl" style="border-color: ${col}">
                ${inc.eventCode}
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const incidentMarker = L.marker([inc.coordinates.lat, inc.coordinates.lng], {
          icon: incidentIcon,
        });

        incidentMarker.on("click", () => {
          selectIncident(inc);
        });

        incidentMarker.bindPopup(`
          <div class="font-mono text-xs p-1 text-slate-100 max-w-xs">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-2 h-2 rounded-full" style="background-color: ${col}"></span>
              <span class="font-bold text-white">${inc.eventCode}</span>
              <span class="px-1 py-0.2 bg-white/10 rounded-xs text-[9px] font-semibold" style="color: ${col}">${inc.severity}</span>
            </div>
            <div class="font-semibold text-slate-200 mb-1 leading-tight">${inc.title}</div>
            <div class="text-[10px] text-slate-400 mb-1">${inc.locationName}</div>
            <div class="flex justify-between border-t border-white/10 pt-1 text-[10px]">
              <span class="text-slate-400">AT RISK: <strong class="text-white">${inc.populationAtRisk.toLocaleString()}</strong></span>
              <span class="text-orange-400 font-bold">INDEX: ${inc.relocationScore}</span>
            </div>
          </div>
        `);

        incidentsGroup.addLayer(incidentMarker);
      });

      // --- Dynamic Zoom Listeners for Geographic Reference Layers ---
      map.on("zoom", () => {
        updateZoomDependentLayers(map.getZoom());
      });

      map.on("zoomend", () => {
        updateZoomDependentLayers(map.getZoom());
      });

      // Initial update for starting zoom (5.0)
      updateZoomDependentLayers(map.getZoom());

      setMapLoaded(true);
    }

    initLeaflet();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectIncident, updateZoomDependentLayers]);

  // Current Zoom Tier Descriptor
  const getZoomTierInfo = (zoom: number) => {
    if (zoom < 5.8) {
      return {
        tier: "TIER 1",
        label: "SUB-CONTINENT OVERVIEW",
        detail: "State Codes & National Boundaries active. Zoom in towards India to unveil full State Names & Mountain Systems.",
        badgeVariant: "cyan" as const,
      };
    } else if (zoom < 7.2) {
      return {
        tier: "TIER 2",
        label: "STATE & REGIONAL SECTORS",
        detail: "Full State Names, Capitals, Mountain Systems (Himalayas, Ghats) and River Basins revealed.",
        badgeVariant: "orange" as const,
      };
    } else {
      return {
        tier: "TIER 3",
        label: "DISTRICT & GEOGRAPHIC WATERSHED",
        detail: "High-altitude Peaks (Nanda Devi, Trishul), Mountain Passes, Dams (Tehri, Hirakud) & District Centers active.",
        badgeVariant: "red" as const,
      };
    }
  };

  const currentTier = getZoomTierInfo(currentZoom);

  if (useGoogleMaps) {
    return (
      <div className={`relative w-full h-full min-h-[440px] bg-[#05070e] overflow-hidden select-none ${className}`}>
        <GoogleMap2DView
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={onSelectIncident}
          incidents={activeIncidents}
          onFallbackToLeaflet={() => setUseGoogleMaps(false)}
          basemap={currentBasemap}
          onBasemapChange={handleBasemapChange}
          activeLayers={propActiveLayers}
          layerOpacities={propLayerOpacities}
        />
        <div className="absolute bottom-3.5 left-3.5 z-20">
          <button
            onClick={() => setUseGoogleMaps(false)}
            className="px-2.5 py-1 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-[10px] text-isie-text-muted hover:text-white rounded-xs font-mono backdrop-blur-md shadow-md transition-colors"
            title="Switch to Offline Tactical Vector Map"
          >
            SWITCH TO VECTOR MAP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full min-h-[360px] bg-[#05070e] overflow-hidden select-none border border-white/10 ${className}`}
    >
      {/* Leaflet DOM Mounting Container */}
      <div
        ref={mapContainerRef}
        className={`absolute inset-0 w-full h-full z-0 ${
          currentBasemap === "satellite"
            ? "map-style-satellite"
            : mapStyle === "TACTICAL"
            ? "map-style-tactical"
            : "map-style-natural"
        }`}
      />

      {/* Top Header Tactical HUD Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <TacticalBadge variant="orange" size="sm">
            2D INDIA TACTICAL
          </TacticalBadge>

          {/* Quick Basemap Toggle: Satellite vs Street */}
          <BasemapQuickToggle
            basemap={currentBasemap}
            onChange={handleBasemapChange}
          />

          <button
            onClick={() => setUseGoogleMaps(true)}
            className="px-2 py-0.5 bg-isie-cyan/20 hover:bg-isie-cyan/30 border border-isie-cyan/60 text-isie-cyan hover:text-white rounded-xs font-mono text-[10px] font-bold uppercase transition-colors"
            title="Switch to Google Maps 2D Operational View"
          >
            SWITCH TO GOOGLE MAPS
          </button>

          {/* Progressive Zoom Level Telemetry Badge */}
          <div className="flex items-center gap-1.5 bg-[#05070e]/95 border border-cyan-500/40 px-2 py-0.5 rounded-xs backdrop-blur-md shadow-lg font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-bold">ZOOM: {currentZoom.toFixed(1)}X</span>
            <span className="text-white/30">|</span>
            <span className="text-slate-200 font-semibold">{currentTier.tier}:</span>
            <span className="text-white font-bold">{currentTier.label}</span>
          </div>

          {/* Geo Focus Quick Presets */}
          <div className="hidden md:flex items-center gap-1 bg-isie-panel/90 border border-white/15 p-1 rounded-sm backdrop-blur-md shadow-md overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 px-1.5 py-0.5 border-r border-white/10 text-[9px] font-mono text-isie-cyan font-bold">
              <Compass className="w-3 h-3 text-isie-cyan animate-pulse" />
              <span>FOCUS:</span>
            </div>
            {[
              { id: "INDIA", label: "INDIA (5.0X)", lat: 22.5, lon: 78.9, zoom: 5.0 },
              { id: "CHAMOLI", label: "CHAMOLI (8.2X)", lat: 30.5541, lon: 79.5663, zoom: 8.2 },
              { id: "ASSAM", label: "ASSAM (7.8X)", lat: 26.6854, lon: 93.3512, zoom: 7.8 },
              { id: "CYCLONE", label: "ODISHA (7.8X)", lat: 19.8135, lon: 85.8312, zoom: 7.8 },
              { id: "CAUVERY", label: "CAUVERY (8.0X)", lat: 11.9022, lon: 78.1456, zoom: 8.0 },
              { id: "HQ", label: "DELHI HQ (9.0X)", lat: 28.6139, lon: 77.2090, zoom: 9.0 },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  mapInstanceRef.current?.flyTo([p.lat, p.lon], p.zoom, { duration: 1.2 });
                  const inc = activeIncidents.find(
                    (i) =>
                      Math.abs(i.coordinates.lat - p.lat) < 0.3 &&
                      Math.abs(i.coordinates.lng - p.lon) < 0.3
                  );
                  if (inc) selectIncident(inc);
                }}
                className="px-1.5 py-0.5 rounded-xs font-mono text-[9px] uppercase tracking-wider text-isie-text-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Operational Incidents Indicator */}
        <div className="flex items-center gap-1.5 bg-isie-panel/90 border border-white/15 px-2.5 py-1 rounded-sm backdrop-blur-md shadow-md pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-mono text-[10px] text-white tracking-wider font-semibold">
            {activeIncidents.length} OPERATIONAL TARGETS
          </span>
        </div>
      </div>

      {/* Progressive Disclosure Guide Ribbon (Shows current revealed features) */}
      <div className="absolute top-12 left-2.5 z-10 hidden sm:flex items-center gap-2 bg-[#05070e]/85 border border-white/10 px-2.5 py-1 rounded-xs backdrop-blur-md pointer-events-none">
        <Info className="w-3 h-3 text-cyan-400 shrink-0" />
        <span className="font-mono text-[9px] text-slate-300">
          {currentTier.detail}
        </span>
      </div>

      {/* Selected Incident Tactical Dossier Card (Floating Overlay) */}
      {activeIncident && (
        <div className="absolute top-20 left-2.5 right-2.5 sm:right-auto sm:w-80 z-20 bg-isie-panel/95 border border-isie-primary/50 rounded-sm p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-text">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                {activeIncident.eventCode} // {activeIncident.severity}
              </span>
            </div>
            <button
              onClick={() => selectIncident(null)}
              className="text-isie-text-muted hover:text-white p-1 rounded-xs hover:bg-white/10"
              title="Close Dossier"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <h4 className="font-semibold text-white leading-snug">
              {activeIncident.title}
            </h4>
            <div className="text-[10px] text-isie-text-secondary flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-isie-cyan shrink-0" />
              <span className="truncate">{activeIncident.locationName}</span>
            </div>
            <p className="text-[10px] text-isie-text-dim leading-relaxed border-t border-white/5 pt-1.5">
              {activeIncident.summary}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5 text-[10px]">
              <div className="bg-white/[0.03] p-1.5 rounded-xs">
                <span className="text-isie-text-muted block text-[9px]">AT RISK</span>
                <span className="text-white font-bold">{activeIncident.populationAtRisk.toLocaleString()}</span>
              </div>
              <div className="bg-white/[0.03] p-1.5 rounded-xs">
                <span className="text-isie-text-muted block text-[9px]">RELOCATION INDEX</span>
                <span className="text-isie-primary font-bold">{activeIncident.relocationScore} / 100</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Layer Legend (Bottom-Left) */}
      <div className="absolute bottom-2.5 left-2.5 z-10 bg-isie-panel/90 border border-white/10 p-2.5 rounded-sm backdrop-blur-md hidden sm:block max-w-[240px] pointer-events-none">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-isie-text-muted font-semibold">
            Tactical GIS Legend
          </p>
          <span className="font-mono text-[8px] text-cyan-400 font-bold">
            {currentZoom >= 5.8 ? "ZOOM REVEAL ON" : "ZOOM IN FOR DETAILS"}
          </span>
        </div>
        <div className="flex flex-col gap-1 font-mono text-[9px]">
          <span className="text-sky-300">Map features: geographic reference</span>
          <span className="text-amber-300">Hazards, routes & shelters: no connected provider</span>
        </div>
      </div>

      {/* Layer Control Drawer (Collapsible) */}
      {layersOpen && (
        <div className="absolute top-11 right-2.5 z-20 w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-isie-panel/95 border border-white/20 p-3 rounded-sm shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-isie-text-primary">
              Tactical GIS Layers
            </span>
            <button
              onClick={() => setLayersOpen(false)}
              className="text-xs text-isie-text-muted hover:text-white px-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 font-mono text-[11px]">
            {[
              { key: "baseMap" as const, label: "Geographic base map" },
              { key: "stateBoundaries" as const, label: "Reference state names & boundaries" },
              { key: "rivers" as const, label: "Reference river geography" },
              { key: "terrain" as const, label: "Reference terrain features" },
              { key: "incidents" as const, label: "Workspace incident records" },
            ].map(({ key, label }) => (
              <div
                key={key}
                onClick={() => toggleLayer(key)}
                className={`flex items-center justify-between p-2 rounded-xs border cursor-pointer transition-colors ${
                  layerVisibility[key]
                    ? "bg-sky-950/30 border-sky-500/30 text-sky-200"
                    : "bg-white/[0.02] border-white/5 text-isie-text-muted hover:bg-white/[0.05]"
                }`}
              >
                <span className="truncate pr-2">{label}</span>
                <Eye className={`w-3.5 h-3.5 shrink-0 ${layerVisibility[key] ? "text-sky-400" : "text-white/20"}`} />
              </div>
            ))}
            <p className="px-2 py-1 text-[10px] leading-relaxed text-amber-400">
              Hazard, route, and shelter overlays are unavailable until a source provider is connected.
            </p>
          </div>
        </div>
      )}

      {/* Floating Toolbar at Bottom Right */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 bg-isie-panel/90 border border-white/15 p-1 rounded-sm backdrop-blur-md shadow-2xl">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className={`p-1.5 rounded-sm transition-colors ${
            layersOpen ? "text-isie-primary bg-orange-950/40" : "text-isie-text-secondary hover:text-white"
          }`}
          title="Toggle GIS Layers"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-white/15 my-auto" />
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-1.5 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-sm transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-1.5 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-sm transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMapStyle((s) => (s === "TACTICAL" ? "NATURAL" : "TACTICAL"))}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-xs transition-colors border ${
            mapStyle === "TACTICAL"
              ? "bg-sky-950/50 text-isie-cyan border-sky-500/40 hover:bg-sky-900/60"
              : "bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60"
          }`}
          title="Toggle Basemap Style: Tactical Navy vs Natural Geography"
        >
          <Compass className="w-3 h-3" />
          <span className="hidden sm:inline">{mapStyle === "TACTICAL" ? "TACTICAL" : "NATURAL"}</span>
        </button>
        <button
          onClick={resetIndiaView}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-xs font-mono text-isie-cyan rounded-xs transition-colors border border-isie-cyan/30"
          title="Reset View to India Center (22.5°N, 78.9°E)"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">RESET INDIA</span>
        </button>
        {onToggleFullscreen && (
          <>
            <div className="w-[1px] h-3.5 bg-white/15 my-auto" />
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-sm transition-colors"
              title={isFullscreen ? "Restore View" : "Maximize Map"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedMap;
