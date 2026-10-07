"use client";

import React, { useState } from "react";
import {
  MapPin,
  Search,
  ExternalLink,
  Navigation,
  Sparkles,
  X,
  Compass,
  Check,
  BookmarkPlus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { TacticalButton } from "../ui/TacticalButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { addTacticalLog } from "@/lib/firebase/client";

interface MapsGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
  defaultCoords?: { lat: number; lng: number };
}

interface GroundingMapItem {
  uri?: string;
  title?: string;
  placeAnswerSources?: {
    reviewSnippets?: Array<{ text: string; uri?: string }>;
  };
}

export const MapsGroundingModal: React.FC<MapsGroundingModalProps> = ({
  isOpen,
  onClose,
  defaultQuery = "Emergency relief centers and hospital infrastructure in Chamoli, Uttarakhand",
  defaultCoords = { lat: 30.55, lng: 79.56 },
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState(defaultQuery);
  const [latitude, setLatitude] = useState<number | undefined>(defaultCoords?.lat);
  const [longitude, setLongitude] = useState<number | undefined>(defaultCoords?.lng);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setIsGettingLocation(false);
        },
        (err) => {
          console.warn("Geolocation warning:", err.message);
          setIsGettingLocation(false);
        }
      );
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResultText(null);
    setGroundingChunks([]);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/maps-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          latitude,
          longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to query Google Maps grounding.");
      }

      setResultText(data.text);
      setGroundingChunks(data.groundingChunks || []);
    } catch (err: any) {
      setError(err?.message || "An error occurred querying Google Maps data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!user || !resultText) return;
    const logId = await addTacticalLog(user.id, {
      title: `Maps Grounding: ${query.slice(0, 48)}...`,
      content: resultText,
      source: "MAPS_GROUNDING",
      sector: "Geospatial Intelligence",
      coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
      groundingData: groundingChunks,
    });
    if (logId) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Extract maps links from chunks
  const extractedMaps: GroundingMapItem[] = [];
  groundingChunks.forEach((chunk: any) => {
    if (chunk.maps) {
      extractedMaps.push(chunk.maps);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-isie-panel border border-white/20 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-isie-panel-light/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-sky-950/60 border border-sky-500/40 flex items-center justify-center text-isie-cyan">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wider text-white uppercase">
                  GOOGLE MAPS GROUNDING INTELLIGENCE
                </span>
                <TacticalBadge variant="cyan" size="sm">
                  gemini-3.5-flash
                </TacticalBadge>
              </div>
              <p className="text-[10px] font-mono text-isie-text-dim">
                AI-assisted place search · verify provider results; no emergency route status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-isie-text-muted hover:text-white rounded-xs hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input Section */}
        <div className="p-4 border-b border-white/10 bg-isie-bg-deep/60 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-isie-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query places, shelters, river basins, hospitals..."
                className="w-full bg-isie-panel border border-white/15 focus:border-isie-cyan p-2 pl-9 text-xs text-white outline-none rounded-xs font-mono"
              />
            </div>
            <TacticalButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !query.trim()}
              icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            >
              {loading ? "GROUNDING..." : "ANALYZE"}
            </TacticalButton>
          </form>

          {/* Geo Coordinates Context */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-isie-text-dim">
            <div className="flex items-center gap-2">
              <span className="text-white/60">GEOGRAPHIC BIAS:</span>
              <span className="text-isie-cyan">LAT {latitude ?? "GLOBAL"}</span>
              <span>•</span>
              <span className="text-amber-400">LON {longitude ?? "GLOBAL"}</span>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="inline-flex items-center gap-1 text-isie-text-muted hover:text-white transition-colors"
            >
              <Navigation className="w-3 h-3 text-isie-cyan" />
              <span>{isGettingLocation ? "ACQUIRING..." : "USE MY LOCATION"}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xs text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-isie-cyan animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs uppercase tracking-widest">
                QUERYING GOOGLE MAPS GROUNDING...
              </span>
            </div>
          )}

          {!loading && !resultText && !error && (
            <div className="py-10 text-center text-isie-text-muted space-y-2">
              <Compass className="w-10 h-10 mx-auto text-white/20" />
              <p className="text-xs">
                Enter a query above to query real-time Google Maps place citations and infrastructure intelligence.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {[
                  "Hospitals near Chamoli Alaknanda valley",
                  "Major bridges and flood gauges along Brahmaputra in Assam",
                  "Cyclone shelter network in Odisha Paradip port",
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => {
                      setQuery(sample);
                    }}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xs text-[10px] text-isie-text-secondary hover:text-white transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {resultText && (
            <div className="space-y-4">
              {/* Analysis Text */}
              <div className="bg-white/[0.02] border border-white/10 p-3.5 rounded-xs leading-relaxed text-isie-text-primary whitespace-pre-wrap">
                {resultText}
              </div>

              {/* Verified Google Maps Citations */}
              {extractedMaps.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>GOOGLE MAPS PLACE RESULTS ({extractedMaps.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extractedMaps.map((place, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-isie-panel-light/60 border border-white/10 rounded-xs flex flex-col justify-between gap-1.5"
                      >
                        <div>
                          <div className="font-semibold text-white truncate text-xs">
                            {place.title || "Identified Location"}
                          </div>
                          {place.placeAnswerSources?.reviewSnippets?.[0]?.text && (
                            <p className="text-[10px] text-isie-text-muted line-clamp-2 mt-0.5">
                              "{place.placeAnswerSources.reviewSnippets[0].text}"
                            </p>
                          )}
                        </div>
                        {place.uri && (
                          <a
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-bold tracking-wider pt-1 hover:underline"
                          >
                            <span>VIEW ON GOOGLE MAPS</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 border-t border-white/10 bg-isie-panel-light/40 flex items-center justify-between">
          <div className="text-[10px] font-mono text-isie-text-dim flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>FIRESTORE PERSISTENCE READY</span>
          </div>
          <div className="flex items-center gap-2">
            {resultText && (
              <TacticalButton
                variant="secondary"
                size="sm"
                onClick={handleSaveToFirestore}
                disabled={savedSuccess}
                icon={savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              >
                {savedSuccess ? "SAVED TO FIRESTORE" : "SAVE TO TACTICAL LOG"}
              </TacticalButton>
            )}
            <TacticalButton variant="ghost" size="sm" onClick={onClose}>
              CLOSE
            </TacticalButton>
          </div>
        </div>
      </div>
    </div>
  );
};
