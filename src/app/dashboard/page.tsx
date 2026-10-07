"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { AdvancedMap } from "@/components/visuals/AdvancedMap";
import { MapModeSwitcher, MapDisplayMode } from "@/components/visuals/MapModeSwitcher";
import { BasemapQuickToggle, BasemapMode } from "@/components/visuals/BasemapQuickToggle";
import { LeftIntelPanel } from "@/components/panels/LeftIntelPanel";
import { RightIntelPanel } from "@/components/panels/RightIntelPanel";
import { TimelineStrip } from "@/components/timeline/TimelineStrip";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { Maximize2, Minimize2, Flame, Users, Radio, MapPin, Mic, Globe, Plus } from "lucide-react";
import { MapsGroundingModal } from "@/components/intel/MapsGroundingModal";
import { AudioTranscribeModal } from "@/components/intel/AudioTranscribeModal";
import { SearchGroundingModal } from "@/components/intel/SearchGroundingModal";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent } from "@/lib/types/isie";
import { hasPermission } from "@/lib/auth/roles";

const Global3DView = dynamic(() => import("@/components/visuals/SatelliteGlobeView"), {
  ssr: false,
});

export default function DashboardPage() {
  const { user, isDemoMode } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mapMode, setMapMode] = useState<MapDisplayMode>("3D_GLOBE");
  const [basemap, setBasemap] = useState<BasemapMode>("street");
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [transcribeModalOpen, setTranscribeModalOpen] = useState(false);
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);

  const canCreate = !!user && hasPermission(user.role, "canCreateIncident");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribe = incidentService.subscribeIncidents(isDemoMode, (realIncidents) => {
      setIncidents(realIncidents);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isDemoMode]);

  // Compute key aggregate metrics from dynamic incident data
  const totalAtRisk = incidents.reduce((acc, curr) => acc + curr.populationAtRisk, 0);
  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;

  return (
    <AppShell pageTitle="Command Center // Unified Operational Picture">
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto lg:overflow-hidden bg-isie-bg-deep select-none">
        {/* ============================================================ */}
        {/* 1. SECONDARY STATUS / SITUATION STRIP (Single Clean Line)   */}
        {/* ============================================================ */}
        <div className="h-11 px-4 border-b border-white/10 bg-isie-panel/95 shrink-0 z-20 flex items-center justify-between text-xs font-mono overflow-x-auto scrollbar-none whitespace-nowrap min-w-0">
          {/* Left: Crisis & Defense State */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isDemoMode ? "bg-amber-400" : "bg-slate-500"}`} />
            <span className="font-bold text-white uppercase tracking-wider">
              {isDemoMode ? "DEMO EXERCISE" : "NO VERIFIED CRISIS FEED"}
            </span>
            <span className="text-isie-text-muted hidden sm:inline">|</span>
            <span className="text-isie-text-secondary hidden sm:inline truncate max-w-[220px]">
              NO LIVE PROVIDER CONNECTIONS
            </span>
          </div>

          {/* Right: Key Command Telemetry Indicators (Gracefully Collapsed) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
            {/* Operational Incident Creation Trigger (Role-Gated) */}
            {canCreate && (
              <button
                onClick={() => setIsCreateIncidentOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-isie-primary/20 hover:bg-isie-primary/30 border border-isie-primary/60 hover:border-isie-primary text-isie-primary hover:text-white rounded-xs font-mono text-[11px] font-bold tracking-wider transition-all shadow-[0_0_10px_rgba(255,122,24,0.25)] cursor-pointer shrink-0"
                title="Initialize New Operational Incident"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD INCIDENT</span>
              </button>
            )}

            {/* Active Incident Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.04] border border-white/10 rounded-xs">
              <Flame className="w-3.5 h-3.5 text-isie-primary shrink-0" />
              <span className="text-isie-text-dim text-[11px]">{isDemoMode ? "SAMPLE:" : "RECORDS:"}</span>
              <span className="font-bold text-white">{incidents.length}</span>
              {isDemoMode && <span className="text-amber-300 text-[10px] font-semibold">({criticalCount} SAMPLE CRIT)</span>}
            </div>

            {/* Population At Risk (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.04] border border-white/10 rounded-xs">
              <Users className="w-3.5 h-3.5 text-isie-cyan shrink-0" />
              <span className="text-isie-text-dim text-[11px]">AT RISK:</span>
              <span className="font-bold text-amber-300">{incidents.length ? totalAtRisk.toLocaleString() : "—"}</span>
            </div>

            {/* Google Search Grounding Quick Tool */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 hover:border-amber-500/60 rounded-xs text-amber-300 text-[11px] transition-colors"
              title="Query configured search grounding provider"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide hidden sm:inline">SEARCH GROUNDING</span>
            </button>

            {/* Google Maps Grounding Quick Tool */}
            <button
              onClick={() => setMapsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/30 hover:border-sky-500/60 rounded-xs text-sky-300 text-[11px] transition-colors"
              title="Query configured maps grounding provider"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold tracking-wide hidden sm:inline">MAPS GROUNDING</span>
            </button>

            {/* Voice Dispatch & Transcribe Tool */}
            <button
              onClick={() => setTranscribeModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 hover:border-amber-500/60 rounded-xs text-amber-300 text-[11px] transition-colors"
              title="Transcribe a user-provided audio clip"
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide hidden sm:inline">VOICE DISPATCH</span>
            </button>

            {/* Live Telemetry Sensor Stream (Hidden on tablet/mobile) */}
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-sky-950/40 border border-sky-500/30 rounded-xs text-sky-200 text-[11px]">
              <Radio className="w-3 h-3 text-isie-cyan animate-pulse shrink-0" />
              <span className="font-semibold tracking-wide">NO LIVE TELEMETRY FEED</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. MAIN 3-COLUMN COMMAND DASHBOARD (Strict Separation)       */}
        {/* ============================================================ */}
        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden relative z-10">
          {/* Fullscreen Map Override */}
          {isFullscreenMap ? (
            <div className="w-full h-full flex flex-col rounded-sm border border-white/10 overflow-hidden bg-isie-bg-deep shadow-2xl">
              <div className="h-10 px-3 sm:px-4 border-b border-white/10 bg-isie-panel/90 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <MapModeSwitcher mode={mapMode} onChange={setMapMode} />
                  {(mapMode === "2D_MAP" || mapMode === "GOOGLE_MAPS" || mapMode === "SPLIT_VIEW") && (
                    <BasemapQuickToggle basemap={basemap} onChange={setBasemap} />
                  )}
                </div>
                <button
                  onClick={() => setIsFullscreenMap(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xs font-mono text-xs transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>RESTORE 3-COLUMN VIEW</span>
                </button>
              </div>
              <div className="flex-1 min-h-0 relative">
                {mounted && mapMode === "3D_GLOBE" && (
                  <Global3DView
                    incidents={incidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                  />
                )}
                {mounted && mapMode === "2D_MAP" && (
                  <AdvancedMap
                    incidents={incidents}
                    onToggleFullscreen={() => setIsFullscreenMap(false)}
                    isFullscreen
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                    basemap={basemap}
                    onBasemapChange={setBasemap}
                  />
                )}
                {mounted && mapMode === "GOOGLE_MAPS" && (
                  <AdvancedMap
                    incidents={incidents}
                    onToggleFullscreen={() => setIsFullscreenMap(false)}
                    isFullscreen
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                    defaultToGoogleMaps
                    basemap={basemap}
                    onBasemapChange={setBasemap}
                  />
                )}
                {mounted && mapMode === "SPLIT_VIEW" && (
                  <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                    <div className="relative h-full min-h-0">
                      <Global3DView
                        incidents={incidents}
                        selectedIncidentId={selectedIncidentId}
                        onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                      />
                    </div>
                    <div className="relative h-full min-h-0">
                      <AdvancedMap
                        incidents={incidents}
                        onToggleFullscreen={() => setIsFullscreenMap(false)}
                        isFullscreen
                        selectedIncidentId={selectedIncidentId}
                        onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                        basemap={basemap}
                        onBasemapChange={setBasemap}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Strict 3-Column Grid on Desktop / Responsive Stacking on Mobile & Tablet */
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 min-h-0">
              {/* -------------------------------------------------------- */}
              {/* CENTER COLUMN: Spatial Intelligence                      */}
              {/* Desktop: 50% width (6 cols) | Mobile: Top under command  */}
              {/* -------------------------------------------------------- */}
              <div className="order-1 lg:order-2 md:col-span-7 lg:col-span-6 h-[440px] md:h-[500px] lg:h-full min-h-0 flex flex-col rounded-sm border border-white/10 bg-isie-bg-deep overflow-hidden shadow-2xl relative">
                {/* Viewport Header Bar with Mode Switcher & Expand Toggle */}
                <div className="h-10 px-3 sm:px-4 border-b border-white/10 bg-isie-panel/90 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <MapModeSwitcher mode={mapMode} onChange={setMapMode} />
                    {(mapMode === "2D_MAP" || mapMode === "GOOGLE_MAPS" || mapMode === "SPLIT_VIEW") && (
                      <BasemapQuickToggle basemap={basemap} onChange={setBasemap} />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <TacticalBadge variant="cyan" size="sm" className="hidden sm:inline-flex">
                      INDIA THEATER DUAL ENGINE
                    </TacticalBadge>
                    <button
                      onClick={() => setIsFullscreenMap(true)}
                      className="p-1.5 text-isie-text-muted hover:text-white hover:bg-white/10 rounded-xs transition-colors border border-transparent hover:border-white/10"
                      title="Maximize Map View"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Spatial Viewport Area */}
                <div className="flex-1 min-h-0 relative overflow-hidden bg-radial-vignette">
                  {!mounted ? (
                    <div className="w-full h-full min-h-[360px] bg-isie-bg-deep flex flex-col items-center justify-center font-mono text-xs text-isie-cyan/70 gap-2.5">
                      <div className="w-7 h-7 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
                      <span className="tracking-widest uppercase animate-pulse">INITIALIZING SPATIAL ENGINE...</span>
                    </div>
                  ) : (
                    <>
                      {mapMode === "3D_GLOBE" && (
                        <div className="absolute inset-0">
                          <Global3DView
                            incidents={incidents}
                            selectedIncidentId={selectedIncidentId}
                            onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                          />
                        </div>
                      )}

                      {mapMode === "2D_MAP" && (
                        <div className="absolute inset-0">
                          <AdvancedMap
                            incidents={incidents}
                            onToggleFullscreen={() => setIsFullscreenMap(true)}
                            selectedIncidentId={selectedIncidentId}
                            onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                            basemap={basemap}
                            onBasemapChange={setBasemap}
                          />
                        </div>
                      )}

                      {mapMode === "GOOGLE_MAPS" && (
                        <div className="absolute inset-0">
                          <AdvancedMap
                            incidents={incidents}
                            onToggleFullscreen={() => setIsFullscreenMap(true)}
                            selectedIncidentId={selectedIncidentId}
                            onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                            defaultToGoogleMaps
                            basemap={basemap}
                            onBasemapChange={setBasemap}
                          />
                        </div>
                      )}

                      {mapMode === "SPLIT_VIEW" && (
                        <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                          <div className="relative h-full min-h-0">
                            <Global3DView
                              incidents={incidents}
                              selectedIncidentId={selectedIncidentId}
                              onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                            />
                          </div>
                          <div className="relative h-full min-h-0">
                            <AdvancedMap
                              incidents={incidents}
                              onToggleFullscreen={() => setIsFullscreenMap(true)}
                              selectedIncidentId={selectedIncidentId}
                              onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
                              basemap={basemap}
                              onBasemapChange={setBasemap}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* LEFT COLUMN: Critical Events Triage                      */}
              {/* Desktop: 25% width (3 cols) | Mobile: 2nd section        */}
              {/* -------------------------------------------------------- */}
              <div className="order-2 lg:order-1 md:col-span-5 lg:col-span-3 h-[420px] md:h-[500px] lg:h-full min-h-0 flex flex-col rounded-sm border border-white/10 bg-isie-panel overflow-hidden shadow-xl">
                <LeftIntelPanel
                  incidents={incidents}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
                />
              </div>

              {/* -------------------------------------------------------- */}
              {/* RIGHT COLUMN: Impact & Decision Matrix                   */}
              {/* Desktop: 25% width (3 cols) | Mobile/Tablet: 3rd section */}
              {/* -------------------------------------------------------- */}
              <div className="order-3 lg:order-3 md:col-span-12 lg:col-span-3 h-[420px] md:h-auto lg:h-full min-h-0 flex flex-col rounded-sm border border-white/10 bg-isie-panel overflow-hidden shadow-xl">
                <RightIntelPanel />
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 3. BOTTOM EVENT TIMELINE (Stable & Contained Row)           */}
        {/* ============================================================ */}
        <div className="shrink-0 z-20 border-t border-white/10 shadow-2xl bg-isie-panel">
          <TimelineStrip />
        </div>

        {/* Google Search Grounding Modal */}
        <SearchGroundingModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
        />

        {/* Google Maps Grounding Modal */}
        <MapsGroundingModal
          isOpen={mapsModalOpen}
          onClose={() => setMapsModalOpen(false)}
        />

        {/* Tactical Voice Dispatch & Audio Transcribe Modal */}
        <AudioTranscribeModal
          isOpen={transcribeModalOpen}
          onClose={() => setTranscribeModalOpen(false)}
        />

        {/* Operational Incident Creation Workflow */}
        {canCreate && (
          <CreateIncidentModal
            isOpen={isCreateIncidentOpen}
            onClose={() => setIsCreateIncidentOpen(false)}
            onCreated={(_newId) => {
              setIsCreateIncidentOpen(false);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
