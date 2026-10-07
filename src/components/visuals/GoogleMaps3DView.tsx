"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  AlertTriangle,
  Play,
  Pause,
  MapPin,
  Shield,
  Eye,
  X,
  Layers,
  Globe,
  Radio,
  ExternalLink,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { IntelligenceEvent } from "@/lib/types/isie";
import {
  loadGoogleMaps,
  getGoogleMapsApiKey,
  isGoogleMapsConfigured,
  GMP_ATTRIBUTION_ID,
} from "@/lib/services/googleMapsLoader";

export interface GoogleMaps3DViewProps {
  className?: string;
  showOverlay?: boolean;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IntelligenceEvent | null) => void;
  incidents?: IntelligenceEvent[];
  onFallbackToThreeGlobe?: () => void;
}

export const GoogleMaps3DView: React.FC<GoogleMaps3DViewProps> = ({
  className = "",
  showOverlay = true,
  selectedIncidentId = null,
  onSelectIncident,
  incidents,
  onFallbackToThreeGlobe,
}) => {
  const activeIncidents = incidents ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const map3dElementRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<IntelligenceEvent | null>(null);
  const [currentTilt, setCurrentTilt] = useState(45);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const orbitIntervalRef = useRef<any>(null);

  // Initialize Google Maps 3D Web Component
  useEffect(() => {
    let isCancelled = false;

    async function init3DMap() {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setLoadError(null);

        // Load Maps API with maps3d library
        const google = await loadGoogleMaps();
        if (isCancelled || !containerRef.current) return;

        // Ensure maps3d library is imported
        if (google.maps.importLibrary) {
          await google.maps.importLibrary("maps3d");
        }

        // Verify custom element definition
        if (!customElements.get("gmp-map-3d")) {
          throw new Error(
            "The <gmp-map-3d> Web Component is not available. Please verify that 'Map Tiles API' and 'Maps JavaScript API' are enabled on your Google Cloud project."
          );
        }

        // Clean any existing element
        containerRef.current.innerHTML = "";

        // Create the <gmp-map-3d> element
        const map3d = document.createElement("gmp-map-3d") as any;
        map3d.setAttribute("center", "22.5937,78.9629,4200000"); // India center with 4,200km altitude
        map3d.setAttribute("tilt", "45");
        map3d.setAttribute("heading", "0");
        map3d.setAttribute("range", "4200000");
        map3d.setAttribute("mode", "hybrid");
        map3d.setAttribute("internal-usage-attribution-ids", GMP_ATTRIBUTION_ID);
        map3d.style.width = "100%";
        map3d.style.height = "100%";
        map3d.style.display = "block";

        containerRef.current.appendChild(map3d);
        map3dElementRef.current = map3d;

        // Add 3D markers for incidents once component is mounted
        setTimeout(() => {
          if (isCancelled || !map3dElementRef.current) return;
          render3DMarkers(map3d, activeIncidents);
        }, 500);

        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn("Failed to initialize Google Maps 3D Web Component:", err);
        setLoadError(
          err?.message ||
            "Photorealistic 3D Tiles require 'Map Tiles API' and 'Maps JavaScript API' enabled in Google Cloud Console."
        );
        setLoading(false);
      }
    }

    init3DMap();

    return () => {
      isCancelled = true;
      if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      map3dElementRef.current = null;
    };
  }, []);

  // Helper to render 3D markers inside <gmp-map-3d>
  const render3DMarkers = useCallback(
    (map3d: any, incidentList: IntelligenceEvent[]) => {
      if (!map3d) return;

      // Clear existing markers
      markersRef.current.forEach((m) => {
        try {
          map3d.removeChild(m);
        } catch (_) {}
      });
      markersRef.current = [];

      incidentList.forEach((inc) => {
        try {
          const marker3d = document.createElement("gmp-marker-3d") as any;
          marker3d.setAttribute(
            "position",
            `${inc.coordinates.lat},${inc.coordinates.lng},${inc.coordinates.elevationMeters || 100}`
          );
          marker3d.setAttribute("altitude-mode", "relative-to-ground");
          marker3d.setAttribute("label", inc.eventCode);
          marker3d.setAttribute("title", inc.title);

          marker3d.addEventListener("gmp-click", () => {
            setActiveIncident(inc);
            if (onSelectIncident) onSelectIncident(inc);
          });

          map3d.appendChild(marker3d);
          markersRef.current.push(marker3d);
        } catch (e) {
          console.warn("Could not attach 3D marker:", e);
        }
      });
    },
    [onSelectIncident]
  );

  // Sync selected incident and fly camera to it
  useEffect(() => {
    if (!selectedIncidentId) return;
    const found = activeIncidents.find((i) => i.id === selectedIncidentId);
    if (!found) return;

    setActiveIncident(found);

    const map3d = map3dElementRef.current;
    if (!map3d) return;

    // Fly camera smoothly to incident coordinates
    try {
      if (typeof map3d.flyCameraTo === "function") {
        map3d.flyCameraTo({
          endCamera: {
            center: {
              lat: found.coordinates.lat,
              lng: found.coordinates.lng,
              altitude: found.coordinates.elevationMeters || 100,
            },
            range: 32000, // 32km close-up
            tilt: 62,     // 62 deg oblique angle for mountain/valley relief
            heading: 25,
          },
          durationMillis: 2200,
        });
      } else {
        // Fallback attribute update
        map3d.setAttribute(
          "center",
          `${found.coordinates.lat},${found.coordinates.lng},${found.coordinates.elevationMeters || 100}`
        );
        map3d.setAttribute("range", "32000");
        map3d.setAttribute("tilt", "62");
      }
    } catch (e) {
      console.warn("flyCameraTo error:", e);
    }
  }, [selectedIncidentId, activeIncidents]);

  // Orbit rotation control
  useEffect(() => {
    if (!isOrbiting) {
      if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
      return;
    }

    orbitIntervalRef.current = setInterval(() => {
      const map3d = map3dElementRef.current;
      if (!map3d) return;
      setCurrentHeading((prev) => {
        const next = (prev + 1) % 360;
        try {
          map3d.heading = next;
        } catch (_) {}
        return next;
      });
    }, 120);

    return () => {
      if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
    };
  }, [isOrbiting]);

  // Preset Navigation Destinations
  const flyToDestination = (
    lat: number,
    lng: number,
    range: number,
    tilt: number,
    heading: number
  ) => {
    const map3d = map3dElementRef.current;
    if (!map3d) return;

    try {
      if (typeof map3d.flyCameraTo === "function") {
        map3d.flyCameraTo({
          endCamera: {
            center: { lat, lng, altitude: 0 },
            range,
            tilt,
            heading,
          },
          durationMillis: 2000,
        });
      } else {
        map3d.setAttribute("center", `${lat},${lng},0`);
        map3d.setAttribute("range", `${range}`);
        map3d.setAttribute("tilt", `${tilt}`);
        map3d.setAttribute("heading", `${heading}`);
      }
      setCurrentTilt(tilt);
      setCurrentHeading(heading);
    } catch (e) {
      console.warn("Fly navigation error:", e);
    }
  };

  const handleZoomIn = () => {
    const map3d = map3dElementRef.current;
    if (!map3d) return;
    try {
      const curRange = map3d.range || 4200000;
      const nextRange = Math.max(5000, curRange * 0.6);
      map3d.range = nextRange;
    } catch (_) {}
  };

  const handleZoomOut = () => {
    const map3d = map3dElementRef.current;
    if (!map3d) return;
    try {
      const curRange = map3d.range || 4200000;
      const nextRange = Math.min(20000000, curRange * 1.5);
      map3d.range = nextRange;
    } catch (_) {}
  };

  const handleTiltToggle = () => {
    const map3d = map3dElementRef.current;
    if (!map3d) return;
    const nextTilt = currentTilt >= 65 ? 15 : currentTilt >= 45 ? 65 : 45;
    try {
      map3d.tilt = nextTilt;
      setCurrentTilt(nextTilt);
    } catch (_) {}
  };

  return (
    <div
      className={`relative w-full h-full min-h-[440px] bg-black overflow-hidden select-none font-mono ${className}`}
    >
      {/* 1. Underlying Google Maps 3D Custom Element Mount Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 2. Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-isie-bg-deep/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 text-isie-cyan">
          <div className="w-8 h-8 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
          <span className="text-xs tracking-widest uppercase animate-pulse">
            INITIALIZING PHOTOREALISTIC 3D TILES...
          </span>
          <span className="text-[10px] text-isie-text-dim">
            GOOGLE MAPS PLATFORM 3D ENGINE // VOLUMETRIC TERRAIN
          </span>
        </div>
      )}

      {/* 3. Error Fallback Banner */}
      {loadError && (
        <div className="absolute inset-0 bg-isie-bg-deep/95 z-30 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-isie-panel border border-amber-500/40 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="font-bold tracking-wider uppercase text-sm">
                Google Maps 3D Platform Notice
              </span>
            </div>
            <p className="text-xs text-isie-text-secondary leading-relaxed">
              Google Maps 3D Photorealistic Tiles require enabling the{" "}
              <strong>Map Tiles API</strong> and <strong>Maps JavaScript API</strong> on your Google
              Cloud API key.
            </p>
            {onFallbackToThreeGlobe && (
              <button
                onClick={onFallbackToThreeGlobe}
                className="w-full py-2 bg-isie-primary/20 hover:bg-isie-primary/30 border border-isie-primary text-white text-xs font-bold uppercase rounded-xs transition-colors"
              >
                SWITCH TO SATELLITE GLOBE ENGINE
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Top-Left: Operational 3D Navigation Hub */}
      {showOverlay && (
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-isie-panel/90 backdrop-blur-md border border-white/10 rounded-xs shadow-lg pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-isie-cyan animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              3D EARTH THEATER
            </span>
            <span className="text-isie-text-dim text-[11px]">|</span>
            <span className="text-[11px] text-isie-text-secondary">
              TILT: {currentTilt}° // HD 3D TILES
            </span>
          </div>

          {/* Quick Geographic Flight Presets */}
          <div className="flex flex-wrap items-center gap-1 pointer-events-auto">
            <button
              onClick={() => flyToDestination(22.5937, 78.9629, 14000000, 15, 0)}
              className="px-2 py-0.5 bg-isie-bg-surface/80 hover:bg-white/10 border border-white/10 hover:border-isie-primary/50 text-[10px] text-isie-text-muted hover:text-white rounded-xs transition-colors"
            >
              GLOBAL EARTH
            </button>
            <button
              onClick={() => flyToDestination(22.5937, 78.9629, 4200000, 45, 0)}
              className="px-2 py-0.5 bg-isie-bg-surface/80 hover:bg-white/10 border border-white/10 hover:border-isie-primary/50 text-[10px] text-isie-text-muted hover:text-white rounded-xs transition-colors"
            >
              INDIA THEATER
            </button>
            <button
              onClick={() => flyToDestination(30.5541, 79.5663, 22000, 65, 35)}
              className="px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-[10px] text-amber-300 rounded-xs transition-colors"
            >
              CHAMOLI GLACIER
            </button>
            <button
              onClick={() => flyToDestination(26.6854, 93.3512, 35000, 55, 10)}
              className="px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-[10px] text-amber-300 rounded-xs transition-colors"
            >
              BRAHMAPUTRA
            </button>
            <button
              onClick={() => flyToDestination(19.8135, 85.8312, 45000, 50, 345)}
              className="px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-[10px] text-amber-300 rounded-xs transition-colors"
            >
              CYCLONE CORRIDOR
            </button>
          </div>
        </div>
      )}

      {/* 5. Top-Right: Camera Mode Controls */}
      {showOverlay && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {/* Orbit Animation Toggle */}
          <button
            onClick={() => setIsOrbiting(!isOrbiting)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-[11px] backdrop-blur-md transition-colors ${
              isOrbiting
                ? "bg-isie-primary text-black font-bold border-isie-primary"
                : "bg-isie-panel/90 border-white/10 text-isie-text-muted hover:text-white"
            }`}
            title={isOrbiting ? "Pause 3D Orbit" : "Start Orbit Flight"}
          >
            {isOrbiting ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>ORBIT</span>
          </button>

          {/* Tilt Step Toggle */}
          <button
            onClick={handleTiltToggle}
            className="flex items-center gap-1 px-2.5 py-1 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 rounded-xs text-[11px] text-isie-text-muted hover:text-white backdrop-blur-md transition-colors"
            title="Toggle Camera Pitch / Tilt Angle"
          >
            <Compass className="w-3.5 h-3.5 text-isie-cyan" />
            <span>TILT ({currentTilt}°)</span>
          </button>
        </div>
      )}

      {/* 6. Bottom-Right: 3D Camera Zoom & Pitch Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-white rounded-xs flex items-center justify-center transition-colors shadow-lg"
          title="Zoom Into 3D Surface"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-white rounded-xs flex items-center justify-center transition-colors shadow-lg"
          title="Zoom Out to Orbital Perspective"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => flyToDestination(22.5937, 78.9629, 4200000, 45, 0)}
          className="w-8 h-8 bg-isie-panel/90 hover:bg-isie-panel border border-white/10 hover:border-white/20 text-isie-cyan rounded-xs flex items-center justify-center transition-colors shadow-lg"
          title="Reset to India National Center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 7. Bottom-Left: Selected Incident 3D Overlay Dossier */}
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
              <span className="text-isie-text-dim block">AT RISK</span>
              <span className="text-amber-300 font-bold">
                {activeIncident.populationAtRisk.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-isie-text-dim block">ELEVATION</span>
              <span className="text-isie-cyan font-bold">
                {activeIncident.coordinates.elevationMeters || 120}m MSL
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              flyToDestination(
                activeIncident.coordinates.lat,
                activeIncident.coordinates.lng,
                25000,
                65,
                30
              )
            }
            className="w-full py-1.5 bg-isie-primary/20 hover:bg-isie-primary/30 border border-isie-primary/60 text-white rounded-xs font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            FLY 3D CAMERA TO INCIDENT
          </button>
        </div>
      )}

      {/* Mandatory Attribution Notice for Google Maps Platform */}
      <div className="absolute bottom-1 left-3 z-10 text-[9px] text-isie-text-dim/60 pointer-events-none font-mono">
        Google Maps Platform // Photorealistic 3D Tiles Engine
      </div>
    </div>
  );
};
