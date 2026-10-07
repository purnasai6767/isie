"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HelpCircle, Command, Terminal, Shield, BookOpen, Layers, Compass } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";

export default function HelpPage() {
  const shortcuts = [
    { key: "Ctrl + K / ⌘ + K", action: "Toggle Command Palette Search" },
    { key: "Esc", action: "Close modals and overlays" },
    { key: "G + D", action: "Jump to Command Center Dashboard" },
    { key: "G + M", action: "Jump to Situation Map" },
    { key: "G + C", action: "Jump to Incidents Management" },
    { key: "G + A", action: "Jump to Alert Center" },
  ];

  return (
    <AppShell pageTitle="Help & Documentation // Operational Manual & Reference">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Tactical Manual & Platform Reference
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Prototype workflows, data limitations, and navigation shortcuts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="safe" size="sm">
              DOCS // V1.0-DEMO
            </TacticalBadge>
          </div>
        </div>

        {/* Operating Principles */}
        <div className="p-6 bg-isie-panel border border-white/10 rounded-sm space-y-4">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-white uppercase tracking-wider">
            <Compass className="w-4 h-4 text-isie-primary" />
            <span>The ISIE Decision Intelligence Loop</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-isie-text-secondary">
            <span className="p-1.5 bg-white/5 border border-white/10 text-white font-semibold">1. OBSERVE</span>
            <span className="text-isie-primary">→</span>
            <span className="p-1.5 bg-white/5 border border-white/10 text-white font-semibold">2. UNDERSTAND</span>
            <span className="text-isie-primary">→</span>
            <span className="p-1.5 bg-white/5 border border-white/10 text-white font-semibold">3. CORRELATE</span>
            <span className="text-isie-primary">→</span>
            <span className="p-1.5 bg-white/5 border border-white/10 text-white font-semibold">4. ASSESS</span>
            <span className="text-isie-primary">→</span>
            <span className="p-1.5 bg-white/5 border border-white/10 text-white font-semibold">5. SIMULATE</span>
            <span className="text-isie-primary">→</span>
            <span className="p-1.5 bg-white/5 border border-white/10 text-white font-semibold">6. ALERT</span>
            <span className="text-isie-primary">→</span>
            <span className="p-1.5 bg-sky-950/60 border border-sky-500/40 text-sky-200 font-bold">7. DECIDE</span>
          </div>

          <p className="text-xs text-isie-text-secondary leading-relaxed">
            This prototype demonstrates map navigation, NASA EONET catalog entries, the USGS past-day earthquake feed, on-demand Open-Meteo model forecasts, synthetic tabletop scenarios, and authenticated workspace records. It does not connect official weather warnings, national satellite analysis, river gauges, population, shelter, road-closure, or emergency-routing systems and does not generate operational response decisions.
          </p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="p-6 bg-isie-panel border border-white/10 rounded-sm space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider">
            <Command className="w-4 h-4 text-isie-cyan" />
            <span>Mission Control Hotkeys</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xs"
              >
                <span className="text-isie-text-secondary">{sc.action}</span>
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded-xs text-white text-[11px] font-bold">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-sm font-mono text-xs text-orange-300 space-y-1">
          <div className="font-bold uppercase tracking-wider">
            ● Demo Environment & Prototype Notice
          </div>
          <p className="text-[11px] text-isie-text-secondary leading-relaxed">
            Demo mode uses synthetic exercise data. Authenticated workspace records are user-entered and are not independently verified. NASA EONET is a limited natural-event catalog, not a complete hazard feed or emergency alert service. Open-Meteo provides model forecasts, not official warnings or radar observations. USGS provides a past-day earthquake catalog, not a complete seismic impact assessment. No IMD, CWC, ISRO, Copernicus, population, shelter, road-closure, or emergency-routing provider is connected.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
