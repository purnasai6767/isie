"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Activity,
  ShieldAlert,
  Users,
  TrendingUp,
  AlertTriangle,
  Building,
  Droplets,
  HeartPulse,
  Navigation,
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { riskService } from "@/lib/services/riskService";
import { incidentService } from "@/lib/services/incidentService";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  HazardRedZone,
  CarryingCapacityMetrics,
  RelocationIntelligence,
  IntelligenceEvent,
} from "@/lib/types/isie";

export default function RiskImpactAnalysisPage() {
  const { isDemoMode } = useAuth();
  const [redZones, setRedZones] = useState<HazardRedZone[]>([]);
  const [capacity, setCapacity] = useState<CarryingCapacityMetrics | null>(null);
  const [relocations, setRelocations] = useState<RelocationIntelligence[]>([]);
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<"ALL" | "CAPACITY" | "RELOCATION">("ALL");

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

  useEffect(() => {
    const unsubscribe = incidentService.subscribeIncidents(isDemoMode, setIncidents);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isDemoMode]);

  const totalExposedPop = redZones.reduce(
    (acc, z) => acc + (z.classification === "RED_ZONE" ? z.populationExposed : 0),
    0
  );

  const totalHabitationsInRedZones = incidents
    .filter((i) => i.hazardZoneLevel === "RED_ZONE")
    .reduce((acc, curr) => acc + curr.affectedHabitationsCount, 0);

  const maxRelocationScore = relocations.length > 0
    ? Math.max(...relocations.map((r) => r.relocationPriorityScore))
    : null;

  return (
    <AppShell pageTitle="Risk & Impact Analysis // Carrying Capacity & Vulnerability Assessment">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Multi-Hazard Risk & Carrying Capacity Assessment
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Workspace-entered assessment records. No authoritative population, capacity, infrastructure, or route feed is connected.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {isDemoMode ? "DEMO EXERCISE DATA" : "NO VERIFIED DATA FEED"}
            </TacticalBadge>
            <TacticalBadge variant="orange" size="sm">
              {redZones.length} WORKSPACE ZONE RECORDS
            </TacticalBadge>
          </div>
        </div>

        {loadError && (
          <p role="alert" className="rounded border border-red-500/30 bg-red-950/20 p-3 font-mono text-xs text-red-300">
            Could not load workspace assessments. Check the Firestore connection and access rules, then retry.
          </p>
        )}

        {/* Analytic Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">HABITATIONS IN RED ZONE</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {incidents.length ? totalHabitationsInRedZones : "—"}
            </div>
            <div className="text-[10px] text-red-400 font-semibold">
              Workspace incident records · not independently verified
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">EXPOSED POPULATION</span>
              <Users className="w-4 h-4 text-isie-cyan" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mb-1">
              {redZones.length ? totalExposedPop.toLocaleString() : "—"}
            </div>
            <div className="text-[10px] text-isie-text-dim">
              Workspace assessment values · not independently verified
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">SHELTER DEFICIT INDEX</span>
              <Building className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mb-1">
              {capacity ? `${capacity.populationExposure.capacityDeficitPercentage}%` : "—"}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold">
              Workspace assessment values · not independently verified
            </div>
          </div>

          <div className="p-4 bg-isie-panel border border-white/10 rounded-sm">
            <div className="flex items-center justify-between text-isie-text-muted mb-2">
              <span className="text-[10px] tracking-wider uppercase">RELOCATION URGENCY</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-isie-primary mb-1">
              {maxRelocationScore ?? "—"} {maxRelocationScore !== null && <span className="text-xs font-normal text-white/50">/ 100</span>}
            </div>
            <div className="text-[10px] text-red-400 font-semibold">
              User-entered score · not an evacuation instruction
            </div>
          </div>
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {[
            { id: "ALL" as const, label: "All Modules (02 & 03)" },
            { id: "CAPACITY" as const, label: "Module 02: Carrying Capacity Stress" },
            { id: "RELOCATION" as const, label: "Module 03: Relocation Priority Triage" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDomain(tab.id)}
              className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                selectedDomain === tab.id
                  ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                  : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Detailed Module 02 & Module 03 Analytics Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          {/* Module 02: Carrying Capacity Analytics */}
          {(selectedDomain === "ALL" || selectedDomain === "CAPACITY") && (
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-4 min-h-[420px] min-w-0">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div>
                    <div className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                      Module 02 // Carrying Capacity Stress Matrix
                    </div>
                    <div className="text-[11px] text-isie-text-dim">
                      Shelter capacity, healthcare saturation, potable water & road severance
                    </div>
                  </div>
                  <TacticalBadge variant="critical" size="sm">
                    {capacity ? "WORKSPACE ASSESSMENT" : "NO VERIFIED ASSESSMENT"}
                  </TacticalBadge>
                </div>

                {/* Progress bars */}
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>DISTRICT HOSPITAL BED OCCUPANCY</span>
                      <span className="text-red-400 font-bold">
                        {capacity ? `${capacity.healthcareAvailability.districtHospitalBedOccupancy}% REPORTED` : "NOT AVAILABLE"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      {capacity && <div className="h-full bg-red-500 rounded-full" style={{ width: `${capacity.healthcareAvailability.districtHospitalBedOccupancy}%` }} />}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>CRITICAL ARTERIAL ROAD NETWORK</span>
                      <span className="text-amber-400 font-bold">
                        {capacity ? `${capacity.infrastructureIntegrity.criticalRoadsOperational}% REPORTED OPERATIONAL` : "NOT AVAILABLE"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      {capacity && <div className="h-full bg-amber-500 rounded-full" style={{ width: `${capacity.infrastructureIntegrity.criticalRoadsOperational}%` }} />}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>EMERGENCY RELIEF SHELTER LOAD</span>
                      <span className="text-amber-400 font-bold">
                        {capacity ? `${capacity.populationExposure.currentShelterCapacity.toLocaleString()} BEDS CAPACITY` : "NOT AVAILABLE"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      {capacity && <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (capacity.populationExposure.currentShelterCapacity / Math.max(capacity.populationExposure.totalHabitationPopulation, 1)) * 100)}%` }} />}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-isie-text-secondary mb-1">
                      <span>POTABLE WATER BUFFER HORIZON</span>
                      <span className="text-sky-300 font-bold">
                        {capacity ? `${capacity.resourceReserves.potableWaterHoursRemaining} HRS` : "NOT AVAILABLE"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      {capacity && <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(100, (capacity.resourceReserves.potableWaterHoursRemaining / 72) * 100)}%` }} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 font-mono text-[10px] text-isie-text-dim flex justify-between items-center">
                <span>RATIONS: {capacity ? `${capacity.resourceReserves.emergencyRationPacks.toLocaleString()} PACKS` : "NOT AVAILABLE"}</span>
                <Link href="/resources" className="text-isie-cyan hover:underline flex items-center gap-1 font-semibold">
                  <span>VIEW RESOURCE RECORDS</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Module 03: Relocation Priority Triage */}
          {(selectedDomain === "ALL" || selectedDomain === "RELOCATION") && (
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-4 min-h-[420px] min-w-0">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div>
                    <div className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                      Module 03 // Relocation Priority Scoring
                    </div>
                    <div className="text-[11px] text-isie-text-dim">
                      Workspace-entered scores and plan details; no live route or shelter validation.
                    </div>
                  </div>
                  <TacticalBadge variant="orange" size="sm">
                    {relocations.length} PRIORITIZED
                  </TacticalBadge>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {relocations.map((reloc) => (
                    <div
                      key={reloc.zoneId}
                      className="p-3 bg-white/[0.02] border border-white/10 rounded-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-isie-primary/20 text-isie-primary border border-isie-primary/40 font-bold rounded-xs shrink-0">
                            REPORTED RANK #{reloc.priorityRank}
                          </span>
                          <span className="font-bold text-white truncate">{reloc.zoneName}</span>
                        </div>
                        <span className="text-red-400 font-bold text-sm shrink-0">
                          USER-ENTERED SCORE: {reloc.relocationPriorityScore}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-isie-text-dim gap-1">
                        <span>REPORTED TRANSIT: {reloc.estimatedTransitTimeHours} HRS</span>
                        <span className="text-isie-cyan">REPORTED SHELTER: {reloc.designatedShelters[0]?.name}</span>
                      </div>

                      <div className="text-[10px] text-amber-300">
                        USER-ENTERED ROUTE: {reloc.evacuationRoutesIdentified[0]?.corridorName} (
                        {reloc.evacuationRoutesIdentified[0]?.status})
                      </div>
                    </div>
                  ))}
                  {relocations.length === 0 && (
                    <p className="rounded border border-white/10 p-4 text-xs text-isie-text-dim">
                      No verified relocation assessment is connected. No evacuation priority is calculated.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 font-mono text-[10px] text-isie-text-dim flex justify-between items-center">
                <span>SECTORS QUEUED: {relocations.length}</span>
                <Link href="/geospatial" className="text-isie-primary hover:underline flex items-center gap-1 font-semibold">
                  <span>VIEW SCENARIO MAP</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
