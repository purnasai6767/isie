"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Database, ExternalLink, ShieldCheck, RefreshCw, Satellite, Radio } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { AUTHORITATIVE_SOURCES } from "@/lib/constants/tacticalLayers";

export default function SourcesPage() {
  return (
    <AppShell pageTitle="Data Sources // Authoritative Governmental & Satellite Ingestion Catalog">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Authoritative Data Ingestion Architecture
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Direct upstream connection contracts for Earth observation, rainfall radars, river stages, and terrain elevations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              6 PROVIDERS CATALOGED · 0 CONNECTED
            </TacticalBadge>
          </div>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
