"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Database, ExternalLink, RefreshCw } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { AUTHORITATIVE_SOURCES } from "@/lib/constants/tacticalLayers";
import { useEonetFeed } from "@/lib/hooks/useEonetFeed";

export default function SourcesPage() {
  const { feed, error, loading, refresh } = useEonetFeed();

  return (
    <AppShell pageTitle="Data Sources // Public Event Catalogs & Planned Providers">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Connected & Planned Data Sources
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              NASA EONET is the configured public event catalog; current status appears below. National hazard, weather, hydrology, and response-provider integrations remain disconnected.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant={error ? "warning" : loading ? "muted" : "cyan"} size="sm">
              1 PUBLIC CATALOG · 6 PROVIDERS NOT CONNECTED
            </TacticalBadge>
          </div>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 bg-isie-panel border border-cyan-500/30 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-white">
                  NASA Earth Observatory Natural Event Tracker (EONET)
                </span>
                <TacticalBadge variant={error ? "warning" : loading ? "muted" : "safe"} size="sm">
                  {error ? "UNAVAILABLE" : loading ? "CHECKING" : "CONNECTED"}
                </TacticalBadge>
              </div>
              <div className="font-mono text-[10px] text-isie-cyan mb-2">
                PUBLIC EVENT CATALOG // NASA EONET API v3
              </div>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                Open natural-event catalog entries surfaced by NASA EONET. This is not a comprehensive hazard feed, an official emergency alert, or proof that an event is verified. Only point geometry is plotted; event records without a point remain unplotted.
              </p>
              <p role={error ? "alert" : "status"} className="text-[10px] font-mono text-isie-text-dim">
                {error
                  ? error
                  : loading
                    ? "Checking the upstream catalog…"
                    : `${feed?.events.length ?? 0} open catalog entries · retrieved ${feed ? new Date(feed.fetchedAt).toLocaleString(undefined, { timeZone: "UTC", timeZoneName: "short" }) : "—"}`}
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
              <span>UPSTREAM RETRIEVAL · 10-MINUTE CACHE</span>
              <div className="flex items-center gap-3">
                {error && (
                  <button type="button" onClick={refresh} className="flex items-center gap-1 text-amber-200 hover:underline">
                    <RefreshCw className="w-3 h-3" /> RETRY
                  </button>
                )}
                <a
                  href="https://eonet.gsfc.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-isie-primary hover:underline"
                >
                  <span>NASA EONET</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          {AUTHORITATIVE_SOURCES.map((source) => (
            <div
              key={source.id}
              className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    {source.name}
                  </span>
                  <TacticalBadge variant="muted" size="sm">
                    STANDBY
                  </TacticalBadge>
                </div>
                <div className="font-mono text-[10px] text-isie-cyan mb-2">
                  {source.type} // {source.code}
                </div>
                <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                  {source.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                <span>INGESTION STATUS: DISCONNECTED</span>
                <a
                  href={source.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-isie-primary hover:underline"
                >
                  <span>PORTAL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
