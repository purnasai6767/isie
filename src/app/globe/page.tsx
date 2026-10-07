"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { Globe, Satellite, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent } from "@/lib/types/isie";
import Link from "next/link";

import SatelliteGlobeView from "@/components/visuals/SatelliteGlobeView";

export default function GlobePage() {
  const { isDemoMode } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribe = incidentService.subscribeIncidents(isDemoMode, (data) => {
      setIncidents(data);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isDemoMode]);

  return (
    <AppShell pageTitle="3D Planetary Intelligence // Global Situation Visualization">
      <div className="flex-1 flex flex-col h-full min-h-0 bg-isie-bg-deep relative overflow-hidden select-none">
        {/* Top Control Bar */}
        <div className="h-12 px-4 border-b border-white/10 bg-isie-panel/90 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/incidents"
              className="flex items-center gap-1.5 font-mono text-xs text-isie-text-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>INCIDENTS</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-isie-cyan" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Planetary Tactical Sphere
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TacticalBadge variant={isDemoMode ? "cyan" : "orange"} size="sm">
              {isDemoMode ? "DEMO EXERCISE" : "WORKSPACE RECORDS"} // {incidents.length} RECORDS
            </TacticalBadge>
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-isie-text-muted">
              <Satellite className="w-3.5 h-3.5 text-amber-400" />
              <span>BASEMAP: PROVIDER IMAGERY</span>
            </div>
          </div>
        </div>

        {/* 3D Globe Container */}
        <div className="flex-1 min-h-0 relative">
          {mounted ? (
            <SatelliteGlobeView
              incidents={incidents}
              selectedRegion="ALL"
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
            />
          ) : (
            <div className="w-full h-full min-h-[400px] bg-isie-bg-deep flex flex-col items-center justify-center font-mono text-xs text-isie-cyan/70 gap-2.5">
              <div className="w-7 h-7 rounded-full border-2 border-isie-cyan border-t-transparent animate-spin" />
              <span className="tracking-widest uppercase animate-pulse">INITIALIZING 3D SPATIAL ENGINE...</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
