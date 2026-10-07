"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Activity, TrendingUp, ShieldAlert, BarChart3, PieChart, Users, HeartPulse, Droplets, Truck } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { riskService } from "@/lib/services/riskService";
import { CarryingCapacityMetrics, HazardRedZone, RelocationIntelligence } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AnalyticsPage() {
  const { isDemoMode } = useAuth();
  const [redZones, setRedZones] = useState<HazardRedZone[]>([]);
  const [capacity, setCapacity] = useState<CarryingCapacityMetrics | null>(null);
  const [relocations, setRelocations] = useState<RelocationIntelligence[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setRedZones([]);
    setCapacity(null);
    setRelocations([]);
    Promise.all([
      riskService.getHazardRedZones(undefined, isDemoMode),
      riskService.getCarryingCapacityAssessment(undefined, isDemoMode),
      riskService.getRelocationPriorities(undefined, isDemoMode),
    ]).then(([zones, assessment, plans]) => {
      if (cancelled) return;
      setRedZones(zones);
      setCapacity(assessment);
      setRelocations(plans);
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isDemoMode]);

  return (
    <AppShell pageTitle="Analytics // Carrying Capacity Stress & Relocation Priority Scoring">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Strategic Analytics & Decision Intelligence
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Workspace-entered assessment values only. No authoritative population, capacity, infrastructure, or route feeds are connected.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {isDemoMode ? "DEMO EXERCISE DATA" : "NO VERIFIED DATA FEED"}
            </TacticalBadge>
          </div>
        </div>

        {loadError && (
          <p role="alert" className="rounded border border-red-500/30 bg-red-950/20 p-3 font-mono text-xs text-red-300">
            Could not load workspace assessments. Check the Firestore connection and access rules, then retry.
          </p>
        )}

        {/* High-Level Analytical KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">REPORTED EXPOSED POPULATION</span>
              <Users className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {redZones.length ? redZones
                .reduce((acc, z) => acc + (z.classification === "RED_ZONE" ? z.populationExposed : 0), 0)
                .toLocaleString() : "—"}
            </div>
            <div className="text-[10px] text-red-400">Workspace-reported value · not independently verified</div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">SHELTER CAPACITY DEFICIT</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mb-1">
              {capacity ? `${capacity.populationExposure.capacityDeficitPercentage}%` : "—"}
            </div>
            <div className="text-[10px] text-isie-text-dim">Workspace estimate · not live capacity data</div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">POTABLE WATER BUFFER</span>
              <Droplets className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-300 mb-1">
              {capacity ? `${capacity.resourceReserves.potableWaterHoursRemaining} HRS` : "—"}
            </div>
            <div className="text-[10px] text-isie-text-dim">Reported value · no live reserve feed</div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">HIGHEST REPORTED SCORE</span>
              <TrendingUp className="w-4 h-4 text-isie-primary" />
            </div>
            <div className="text-2xl font-bold text-isie-primary mb-1">
              {relocations.length ? Math.max(...relocations.map((item) => item.relocationPriorityScore)) : "—"}
              {relocations.length > 0 && <span className="text-sm font-normal text-white/50"> / 100</span>}
            </div>
            <div className="text-[10px] text-isie-primary">Workspace score · not a response priority</div>
          </div>
        </div>

        {/* Carrying Capacity (Module 02) & Relocation (Module 03) Deep Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          {/* Module 02: Infrastructure & Carrying Capacity Stress */}
          <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4 min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Module 02 // Carrying Capacity Assessment Matrix
                </h3>
                <p className="text-[11px] text-isie-text-dim">
                  Workspace-entered resource and population values; not externally validated.
                </p>
              </div>
              <TacticalBadge variant="critical" size="sm">
                {capacity ? "WORKSPACE ASSESSMENT" : "NO VERIFIED ASSESSMENT"}
              </TacticalBadge>
            </div>

            {/* Stress Progress Bars */}
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between text-isie-text-secondary mb-1">
                  <span>HOSPITAL BED OCCUPANCY</span>
                  <span className="text-red-400 font-bold">{capacity ? `${capacity.healthcareAvailability.districtHospitalBedOccupancy}%` : "NOT AVAILABLE"}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  {capacity && <div className="h-full bg-red-500 rounded-full" style={{ width: `${capacity.healthcareAvailability.districtHospitalBedOccupancy}%` }} />}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-isie-text-secondary mb-1">
                  <span>ROAD NETWORK ARTERIAL CLEARANCE</span>
                  <span className="text-amber-400 font-bold">{capacity ? `${capacity.infrastructureIntegrity.criticalRoadsOperational}% REPORTED OPERATIONAL` : "NOT AVAILABLE"}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  {capacity && <div className="h-full bg-amber-500 rounded-full" style={{ width: `${capacity.infrastructureIntegrity.criticalRoadsOperational}%` }} />}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-isie-text-secondary mb-1">
                  <span>EMERGENCY RELIEF SHELTER LOAD</span>
                  <span className="text-amber-400 font-bold">{capacity ? `${capacity.populationExposure.currentShelterCapacity.toLocaleString()} BEDS CAPACITY` : "NOT AVAILABLE"}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  {capacity && <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (capacity.populationExposure.currentShelterCapacity / Math.max(capacity.populationExposure.totalHabitationPopulation, 1)) * 100)}%` }} />}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-isie-text-secondary mb-1">
                  <span>TELECOMMUNICATIONS CELL INTEGRITY</span>
                  <span className="text-sky-400 font-bold">{capacity ? `${capacity.infrastructureIntegrity.telecomTowersOperational}% REPORTED OPERATIONAL` : "NOT AVAILABLE"}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  {capacity && <div className="h-full bg-sky-400 rounded-full" style={{ width: `${capacity.infrastructureIntegrity.telecomTowersOperational}%` }} />}
                </div>
              </div>
            </div>
          </div>

          {/* Module 03: Relocation Priority Triage Table */}
          <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4 min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Module 03 // Relocation Priority Scoring
                </h3>
                <p className="text-[11px] text-isie-text-dim">
                  Workspace-entered scores and plan details; no live route or shelter validation.
                </p>
              </div>
              <TacticalBadge variant="orange" size="sm">
                {relocations.length ? `${relocations.length} WORKSPACE PLANS` : "NO VERIFIED PLANS"}
              </TacticalBadge>
            </div>

            <div className="space-y-3">
              {relocations.map((reloc) => (
                <div
                  key={reloc.zoneId}
                  className="p-3 bg-white/[0.02] border border-white/10 rounded-xs space-y-2 font-mono text-xs min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="px-1.5 py-0.5 bg-isie-primary/20 text-isie-primary border border-isie-primary/40 font-bold rounded-xs shrink-0">
                        REPORTED RANK #{reloc.priorityRank}
                      </span>
                      <span className="font-bold text-white truncate">{reloc.zoneName}</span>
                    </div>
                    <span className="text-red-400 font-bold text-sm shrink-0">
                      USER-ENTERED SCORE: {reloc.relocationPriorityScore}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-isie-text-dim gap-1">
                    <span>REPORTED TRANSIT: {reloc.estimatedTransitTimeHours} HRS</span>
                    <span className="truncate">REPORTED SHELTER: {reloc.designatedShelters[0]?.name}</span>
                  </div>

                  <div className="text-[10px] text-amber-400 truncate">
                    USER-ENTERED ROUTE: {reloc.evacuationRoutesIdentified[0]?.corridorName} (
                    {reloc.evacuationRoutesIdentified[0]?.status})
                  </div>
                </div>
              ))}
              {relocations.length === 0 && (
                <p className="rounded border border-white/10 p-4 font-mono text-xs text-isie-text-dim">
                  No source-backed relocation plans are available. No priority ranks or evacuation instructions are generated.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
