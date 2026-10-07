"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { Globe2, Radio, Compass, Shield, MapPin, AlertCircle, ArrowUpRight } from "lucide-react";
import SatelliteGlobeView from "@/components/visuals/SatelliteGlobeView";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent } from "@/lib/types/isie";

export default function GlobalSituationPage() {
  const { isDemoMode } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("ALL");

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

  const mapFocusPresets = [
    {
      id: "ALL",
      name: "Global Composite View",
    },
    {
      id: "HIM",
      name: "Himalayan Glacial Belt",
    },
    {
      id: "NOR",
      name: "Northern River Basins",
    },
    {
      id: "CST",
      name: "Coastal Surge Corridors",
    },
    {
      id: "PEN",
      name: "Peninsular Catchment Areas",
    },
  ];

  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = incidents.filter((i) => ["HIGH", "MEDIUM", "MODERATE"].includes(i.severity)).length;
  const otherSeverityCount = incidents.length - criticalCount - warningCount;

  return (
    <AppShell pageTitle="Global Situation // Macro Environmental Telemetry">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Top Header & Regional Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe2 className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Global Operating Environment
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Worldwide basemap and place search with workspace incident records. No global hazard or weather feed is connected.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <TacticalBadge variant="cyan" size="sm" pulse>
              {isDemoMode
                ? `DEMO EXERCISE // ${incidents.length} SAMPLE SIGNALS`
                : `WORKSPACE RECORDS // ${incidents.length} · NO LIVE FEED`}
            </TacticalBadge>
            <Link
              href="/geospatial"
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xs font-mono text-[11px] border border-white/10 flex items-center gap-1 transition-colors"
            >
              <span>2D MAP</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Map focus presets; these do not indicate data coverage. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-isie-text-dim">
            Map focus · use the map search for any place
          </span>
          {mapFocusPresets.map((reg) => (
            <button
              key={reg.id}
              onClick={() => setSelectedRegion(reg.id)}
              className={`px-3 py-1.5 rounded-xs font-mono text-xs uppercase tracking-wider transition-colors border flex items-center gap-1.5 ${
                selectedRegion === reg.id
                  ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                  : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{reg.name}</span>
            </button>
          ))}
        </div>

        {/* Main 3D Global Space */}
        <div className="h-[480px] sm:h-[560px] w-full rounded-sm border border-white/10 relative overflow-hidden bg-isie-bg-deep shadow-2xl min-w-0">
          {mounted ? (
            <SatelliteGlobeView
              incidents={incidents}
              selectedRegion={selectedRegion}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(inc) => setSelectedIncidentId(inc?.id || null)}
            />
          ) : (
            <div className="w-full h-full min-h-[320px] bg-isie-bg-deep flex items-center justify-center font-mono text-xs text-isie-cyan/60 animate-pulse">
              INITIALIZING SATELLITE GLOBE...
            </div>
          )}
        </div>

        {/* Regional Situation Grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm min-w-0 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                {isDemoMode ? "Sample Exercise Signals" : "Workspace Incident Records"}
              </span>
              <TacticalBadge variant="orange" size="sm">
                {incidents.length} SIGNALS
              </TacticalBadge>
            </div>
            <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className="p-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-white text-[11px]">{inc.eventCode}</span>
                    <span
                      className={`text-[9px] font-bold ${
                        inc.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-isie-text-dim truncate">{inc.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                Cross-Region Correlation
              </span>
              <TacticalBadge variant="muted" size="sm">
                NOT AVAILABLE
              </TacticalBadge>
            </div>
            <p className="text-[11px] leading-relaxed text-isie-text-dim">
              No provider-backed cross-region correlation service is connected. No correlation scores are shown.
            </p>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                Recorded Incident Severity
              </span>
              <TacticalBadge variant="muted" size="sm">
                {incidents.length} WORKSPACE RECORDS
              </TacticalBadge>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-red-400">
                <span>CRITICAL REPORTS · UNVERIFIED</span>
                <span className="font-bold">{criticalCount}</span>
              </div>
              <div className="flex justify-between items-center text-amber-400">
                <span>HIGH / MODERATE REPORTS</span>
                <span className="font-bold">{warningCount}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>OTHER REPORTED SEVERITY</span>
                <span className="font-bold">{otherSeverityCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
