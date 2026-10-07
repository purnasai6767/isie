import React from "react";
import {
  ShieldAlert,
  Layers,
  Activity,
  Cpu,
} from "lucide-react";
import { LandingVisualHero } from "@/components/landing/LandingVisualHero";
import { LandingHeaderActions, LandingHeroActions } from "@/components/landing/LandingClientActions";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-isie-bg-deep text-isie-text-primary overflow-x-hidden selection:bg-isie-primary/30">
      {/* Volumetric 3D Background Canvas */}
      <LandingVisualHero />

      {/* Top Tactical Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-isie-primary to-orange-700 flex items-center justify-center font-mono font-bold text-black text-sm shadow-[0_0_15px_rgba(255,122,24,0.4)] shrink-0">
            IS
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-sm sm:text-base font-bold tracking-widest text-white uppercase leading-tight truncate">
              ISIE
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-isie-text-muted tracking-wider truncate">
              INTEGRATED SITUATION INTELLIGENCE ENGINE
            </span>
          </div>
        </div>

        <LandingHeaderActions />
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-28 flex flex-col items-center text-center">
        {/* Classification Header */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-sm mb-6 font-mono text-[11px] sm:text-xs text-isie-text-secondary max-w-full">
          <span className="w-2 h-2 rounded-full bg-isie-primary animate-ping shrink-0" />
          <span className="tracking-widest uppercase truncate">
            SPATIAL INTELLIGENCE PROTOTYPE · NOT FOR EMERGENCY OPERATIONS
          </span>
        </div>

        {/* Large Identity & Title */}
        <h1 className="font-mono text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          SPATIAL INTELLIGENCE &{" "}
          <span className="bg-gradient-to-r from-isie-primary via-orange-400 to-amber-200 bg-clip-text text-transparent">
            CRISIS DECISION
          </span>{" "}
          SUPPORT
        </h1>

        {/* Intelligence Loop Tagline */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 font-mono text-[11px] sm:text-xs md:text-sm text-isie-text-muted uppercase tracking-widest mb-8 max-w-3xl">
          <span className="text-white font-semibold">OBSERVE</span>
          <span className="text-isie-primary">→</span>
          <span className="text-white font-semibold">UNDERSTAND</span>
          <span className="text-isie-primary">→</span>
          <span className="text-white font-semibold">CORRELATE</span>
          <span className="text-isie-primary">→</span>
          <span className="text-white font-semibold">ASSESS</span>
          <span className="text-isie-primary">→</span>
          <span className="text-white font-semibold">SIMULATE</span>
          <span className="text-isie-primary">→</span>
          <span className="text-white font-semibold">ALERT</span>
          <span className="text-isie-primary">→</span>
          <span className="text-isie-cyan font-semibold">DECIDE</span>
        </div>

        {/* Short Mission Concept */}
        <p className="text-sm sm:text-base md:text-lg text-isie-text-secondary max-w-3xl leading-relaxed mb-10 font-normal">
          Explore global map imagery, NASA&apos;s limited natural-event catalog, and on-demand Open-Meteo forecasts. Hazard zones, capacity metrics, routes, and response scenarios are demonstration workflows—not live assessments or emergency instructions.
        </p>

        {/* Primary Action Group */}
        <LandingHeroActions />

        {/* Core Pillars / 4 Modules Architecture */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {/* Module 01 */}
          <div className="p-5 bg-isie-panel/80 border border-white/10 rounded-sm relative overflow-hidden backdrop-blur-md group hover:border-isie-primary/40 transition-colors flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-isie-primary font-semibold">
                  MODULE 01
                </span>
                <Layers className="w-4 h-4 text-isie-text-muted group-hover:text-isie-primary transition-colors shrink-0" />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
                Hazard Red Zones
              </h3>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-3">
                Demonstrates synthetic hazard-zone mapping. No satellite SAR, weather radar, or verified boundary provider is connected.
              </p>
            </div>
            <div className="font-mono text-[10px] text-isie-text-dim uppercase tracking-wider pt-2 border-t border-white/5">
              TABLETOP ONLY · NOT A VERIFIED RISK
            </div>
          </div>

          {/* Module 02 */}
          <div className="p-5 bg-isie-panel/80 border border-white/10 rounded-sm relative overflow-hidden backdrop-blur-md group hover:border-isie-cyan/40 transition-colors flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-isie-cyan font-semibold">
                  MODULE 02
                </span>
                <Activity className="w-4 h-4 text-isie-text-muted group-hover:text-isie-cyan transition-colors shrink-0" />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
                Carrying Capacity
              </h3>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-3">
                Shows exercise or user-entered capacity fields. Population, hospital, water, and road-status datasets are not connected.
              </p>
            </div>
            <div className="font-mono text-[10px] text-isie-text-dim uppercase tracking-wider pt-2 border-t border-white/5">
              USER-ENTERED / SYNTHETIC ONLY
            </div>
          </div>

          {/* Module 03 */}
          <div className="p-5 bg-isie-panel/80 border border-white/10 rounded-sm relative overflow-hidden backdrop-blur-md group hover:border-amber-500/40 transition-colors flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                  MODULE 03
                </span>
                <ShieldAlert className="w-4 h-4 text-isie-text-muted group-hover:text-amber-400 transition-colors shrink-0" />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
                Relocation Priority
              </h3>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-3">
                Demonstrates a planning interface; verified routes, populations, travel times, and shelter capacities are unavailable.
              </p>
            </div>
            <div className="font-mono text-[10px] text-isie-text-dim uppercase tracking-wider pt-2 border-t border-white/5">
              NOT A VERIFIED PLAN · NOT FOR DISPATCH
            </div>
          </div>

          {/* Module 04 */}
          <div className="p-5 bg-isie-panel/80 border border-white/10 rounded-sm relative overflow-hidden backdrop-blur-md group hover:border-indigo-400/40 transition-colors flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-indigo-400 font-semibold">
                  MODULE 04
                </span>
                <Cpu className="w-4 h-4 text-isie-text-muted group-hover:text-indigo-400 transition-colors shrink-0" />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">
                What-If Stress Testing
              </h3>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-3">
                Runs fictional tabletop scenarios only. Outputs are not forecasts, measurements, or emergency recommendations.
              </p>
            </div>
            <div className="font-mono text-[10px] text-isie-text-dim uppercase tracking-wider pt-2 border-t border-white/5">
              OUTPUT: CASCADE FAILURE SIMULATION
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
