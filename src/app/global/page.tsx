"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { Globe2, ArrowUpRight, ExternalLink, RefreshCw } from "lucide-react";
import SatelliteGlobeView from "@/components/visuals/SatelliteGlobeView";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent } from "@/lib/types/isie";
import { useEonetFeed } from "@/lib/hooks/useEonetFeed";
import type { EonetEvent } from "@/lib/types/eonet";

export default function GlobalSituationPage() {
  const { isDemoMode } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedEonetId, setSelectedEonetId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const { feed, error: eonetError, loading: eonetLoading, refresh: refreshEonet } = useEonetFeed();

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
              Published global imagery, NASA EONET natural-event catalog entries, and separate workspace reports. EONET coverage is limited and is not an emergency alert service.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <TacticalBadge variant="cyan" size="sm" pulse>
              {isDemoMode
                ? `DEMO EXERCISE // ${incidents.length} SAMPLE SIGNALS`
                : `WORKSPACE REPORTS // ${incidents.length} · UNVERIFIED`}
            </TacticalBadge>
            <TacticalBadge
              variant={eonetError ? "warning" : eonetLoading ? "muted" : "safe"}
              size="sm"
              pulse={!eonetError && !eonetLoading}
            >
              {eonetError
                ? "NASA EONET UNAVAILABLE"
                : eonetLoading
                  ? "LOADING NASA EONET"
                  : `NASA EONET · ${feed?.events.length ?? 0} CATALOG EVENTS`}
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
              onSelectIncident={(inc) => {
                setSelectedIncidentId(inc?.id || null);
                if (inc) setSelectedEonetId(null);
              }}
              eonetEvents={feed?.events ?? []}
              selectedEonetId={selectedEonetId}
              onSelectEonetEvent={(event) => {
                setSelectedEonetId(event?.id ?? null);
                if (event) setSelectedIncidentId(null);
              }}
              isDemoMode={isDemoMode}
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

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm flex flex-col space-y-3 min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                NASA EONET Open Events
              </span>
              <TacticalBadge variant={eonetError ? "warning" : "cyan"} size="sm">
                {eonetError ? "FEED UNAVAILABLE" : `${feed?.events.length ?? 0} EVENTS`}
              </TacticalBadge>
            </div>
            <p className="text-[10px] leading-relaxed text-isie-text-dim">
              NASA EONET’s open natural-event catalog, not comprehensive global hazard coverage. Events without point locations remain listed but are not plotted.
            </p>
            {eonetError && (
              <div className="flex items-center justify-between gap-2 rounded border border-amber-500/20 bg-amber-950/10 p-2">
                <p role="status" className="text-[10px] text-amber-200">{eonetError}</p>
                <button type="button" onClick={refreshEonet} className="shrink-0 rounded border border-amber-300/20 p-1.5 text-amber-200 hover:bg-amber-300/10" aria-label="Retry NASA EONET feed">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {(feed?.events ?? []).slice(0, 12).map((event: EonetEvent) => (
                <div key={event.id} className="flex min-w-0 items-start gap-2 rounded border border-white/5 bg-white/[0.02] p-2">
                  <button
                    type="button"
                    disabled={!event.location}
                    onClick={() => {
                      setSelectedEonetId(event.id);
                      setSelectedIncidentId(null);
                    }}
                    className="min-w-0 flex-1 text-left disabled:cursor-default"
                  >
                    <span className="block truncate font-mono text-[10px] font-semibold text-cyan-200">{event.title}</span>
                    <span className="mt-0.5 block truncate text-[9px] text-isie-text-dim">
                      {event.categories.join(", ") || "Natural event"} · {event.observedAt ? new Date(event.observedAt).toLocaleDateString() : "Observation date unavailable"}
                    </span>
                  </button>
                  {event.sourceUrl && (
                    <a href={event.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source for ${event.title}`} className="shrink-0 text-isie-text-dim hover:text-cyan-200">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
              {!eonetLoading && !eonetError && feed?.events.length === 0 && (
                <p className="p-2 text-[10px] text-isie-text-dim">NASA EONET currently returned no open events in this catalog.</p>
              )}
              {eonetLoading && !feed && (
                <p className="p-2 text-[10px] text-isie-text-dim">Loading NASA EONET event catalog…</p>
              )}
              {eonetError && !feed && (
                <p className="p-2 text-[10px] text-isie-text-dim">No cached event list is available while the upstream catalog is unreachable.</p>
              )}
            </div>
            {feed && (
              <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 font-mono text-[9px] text-isie-text-dim">
                <span>Retrieved {new Date(feed.fetchedAt).toLocaleString(undefined, { timeZone: "UTC", timeZoneName: "short" })} · NASA EONET</span>
                <a href={feed.sourceUrl} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-isie-cyan hover:underline">
                  SOURCE <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
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
