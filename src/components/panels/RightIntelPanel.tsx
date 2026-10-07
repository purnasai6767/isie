"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Users, HeartPulse, Droplets, Truck, AlertTriangle, ArrowRight } from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { EmptyState } from "../ui/EmptyState";
import { riskService } from "@/lib/services/riskService";
import { CarryingCapacityMetrics, RelocationIntelligence } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";

interface RightIntelPanelProps {
  className?: string;
}

export const RightIntelPanel: React.FC<RightIntelPanelProps> = ({ className = "" }) => {
  const { isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<"CAPACITY" | "RELOCATION" | "SUMMARY">("CAPACITY");
  const [capacity, setCapacity] = useState<CarryingCapacityMetrics | null>(null);
  const [relocations, setRelocations] = useState<RelocationIntelligence[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setCapacity(null);
    setRelocations([]);
    Promise.all([
      riskService.getCarryingCapacityAssessment(undefined, isDemoMode),
      riskService.getRelocationPriorities(undefined, isDemoMode),
    ]).then(([assessment, plans]) => {
      if (cancelled) return;
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
    <div
      className={`flex flex-col h-full min-h-0 min-w-0 bg-isie-panel select-none ${className}`}
    >
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-white/10 bg-isie-panel-light/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Activity className="w-4 h-4 text-isie-cyan shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-isie-text-primary truncate">
              Impact & Decision
            </span>
            <span className="text-[10px] font-mono text-isie-text-dim truncate">
              CAPACITY & RELOCATION MATRIX
            </span>
          </div>
        </div>
        <TacticalBadge variant="cyan" size="sm" className="shrink-0">
          {isDemoMode ? "DEMO DATA" : capacity ? "WORKSPACE DATA" : "UNAVAILABLE"}
        </TacticalBadge>
      </div>

      {/* Module Selector Tabs with Breathing Room */}
      <div className="flex border-b border-white/10 bg-isie-bg-surface/40 text-[11px] font-mono shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab("CAPACITY")}
          className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors shrink-0 whitespace-nowrap ${
            activeTab === "CAPACITY"
              ? "border-isie-cyan text-isie-cyan font-bold bg-sky-950/25"
              : "border-transparent text-isie-text-muted hover:text-white hover:bg-white/5"
          }`}
        >
          CAPACITY (M-02)
        </button>
        <button
          onClick={() => setActiveTab("RELOCATION")}
          className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors shrink-0 whitespace-nowrap ${
            activeTab === "RELOCATION"
              ? "border-isie-primary text-isie-primary font-bold bg-orange-950/25"
              : "border-transparent text-isie-text-muted hover:text-white hover:bg-white/5"
          }`}
        >
          RELOCATION (M-03)
        </button>
        <button
          onClick={() => setActiveTab("SUMMARY")}
          className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors shrink-0 whitespace-nowrap ${
            activeTab === "SUMMARY"
              ? "border-white text-white font-bold bg-white/10"
              : "border-transparent text-isie-text-muted hover:text-white hover:bg-white/5"
          }`}
        >
          EARLY WARNING
        </button>
      </div>

      {/* Main Panel Content with Scroll Containment */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4 scrollbar-thin">
        {loadError && (
          <p role="alert" className="rounded border border-red-500/30 bg-red-950/20 p-3 font-mono text-[10px] text-red-300">
            Could not load workspace assessments. Check the Firestore connection and access rules.
          </p>
        )}

        {activeTab === "CAPACITY" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between font-mono text-xs text-isie-text-muted px-0.5">
              <span className="truncate uppercase font-medium">CARRYING CAPACITY MATRIX</span>
              <span className={`font-bold shrink-0 ml-2 ${capacity ? "text-amber-300" : "text-slate-500"}`}>
                {capacity ? "WORKSPACE DATA" : "NOT AVAILABLE"}
              </span>
            </div>

            {/* Carrying Capacity Metrics with Generous Padding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5 font-mono text-xs">
              {/* Shelter Load */}
              <div className="p-3 bg-white/[0.025] hover:bg-white/[0.045] border border-white/10 hover:border-amber-500/40 rounded-sm flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-isie-text-dim text-[11px] mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <Users className="w-3.5 h-3.5 text-isie-cyan shrink-0" />
                    <span className="truncate">SHELTER LOAD</span>
                  </div>
                  <span className="text-red-400 font-bold text-[10px]">
                    {capacity ? `${capacity.populationExposure.capacityDeficitPercentage}% deficit` : "NOT AVAILABLE"}
                  </span>
                </div>
                <div className="text-sm font-bold text-amber-300 mb-1.5 truncate">
                  {capacity?.populationExposure.currentShelterCapacity.toLocaleString()} BEDS
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-1">
                  {capacity && <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, capacity.populationExposure.capacityDeficitPercentage)}%` }} />}
                </div>
                <div className="text-[10px] text-isie-text-dim truncate">
                  Pop: {capacity?.populationExposure.totalHabitationPopulation.toLocaleString()}
                </div>
              </div>

              {/* Hospital Beds */}
              <div className="p-3 bg-white/[0.025] hover:bg-white/[0.045] border border-white/10 hover:border-red-500/40 rounded-sm flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-isie-text-dim text-[11px] mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <HeartPulse className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">HOSPITAL SURGE</span>
                  </div>
                  <span className="text-amber-400 text-[10px]">
                    {capacity ? `${capacity.healthcareAvailability.criticalMedicineSupplyDays}D MEDS` : "NOT AVAILABLE"}
                  </span>
                </div>
                <div className="text-sm font-bold text-red-300 mb-1.5 truncate">
                  {capacity ? `${capacity.healthcareAvailability.districtHospitalBedOccupancy}% REPORTED` : "NOT AVAILABLE"}
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${capacity ? capacity.healthcareAvailability.districtHospitalBedOccupancy : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-isie-text-dim truncate">
                  {capacity ? `Reported status: ${capacity.healthcareAvailability.districtHospitalBedOccupancy}% occupancy` : "No verified healthcare data"}
                </div>
              </div>

              {/* Potable Water Buffer */}
              <div className="p-3 bg-white/[0.025] hover:bg-white/[0.045] border border-white/10 hover:border-sky-500/40 rounded-sm flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-isie-text-dim text-[11px] mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">WATER BUFFER</span>
                  </div>
                  <span className="text-sky-300 text-[10px]">{capacity ? "WORKSPACE RECORD" : "NOT CONNECTED"}</span>
                </div>
                <div className="text-sm font-bold text-sky-300 mb-1.5 truncate">
                  {capacity?.resourceReserves.potableWaterHoursRemaining} HOURS
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-1">
                  {capacity && <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(100, (capacity.resourceReserves.potableWaterHoursRemaining / 72) * 100)}%` }} />}
                </div>
                <div className="text-[10px] text-isie-text-dim truncate">
                  {capacity ? "Workspace assessment value; verify source" : "No verified water data"}
                </div>
              </div>

              {/* Road Access Integrity */}
              <div className="p-3 bg-white/[0.025] hover:bg-white/[0.045] border border-white/10 hover:border-amber-500/40 rounded-sm flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-isie-text-dim text-[11px] mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">CORRIDORS</span>
                  </div>
                  <span className="text-slate-400 font-bold text-[10px]">
                    {capacity ? `${capacity.infrastructureIntegrity.bridgesAtRiskCount} REPORTED AT RISK` : "NOT AVAILABLE"}
                  </span>
                </div>
                <div className="text-sm font-bold text-amber-300 mb-1.5 truncate">
                  {capacity ? `${capacity.infrastructureIntegrity.criticalRoadsOperational}% REPORTED OPERATIONAL` : "NOT AVAILABLE"}
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${capacity ? capacity.infrastructureIntegrity.criticalRoadsOperational : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-isie-text-dim truncate">
                  {capacity ? "Workspace record · confirm with authority" : "No verified route status"}
                </div>
              </div>
            </div>

            {/* Immediate Decision Recommendation Box */}
            <div className="p-3.5 bg-amber-950/20 border-l-4 border-l-amber-500 border-white/10 rounded-sm text-xs font-mono">
              <div className="text-amber-200 font-bold uppercase mb-1.5 tracking-wider text-[11px]">
                Decision support unavailable
              </div>
              <p className="text-[11px] text-isie-text-secondary leading-relaxed break-words">
                No verified route, shelter, or live incident feeds are connected. This system cannot issue evacuation, dispatch, or response instructions.
              </p>
            </div>
          </div>
        )}

        {activeTab === "RELOCATION" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-xs text-isie-text-muted px-0.5">
              <span>USER-ENTERED RELOCATION PLANS</span>
              <span className="text-isie-primary font-bold">{relocations.length ? "WORKSPACE RECORDS" : "NOT AVAILABLE"}</span>
            </div>

            <p className="rounded border border-amber-500/20 bg-amber-950/10 p-3 text-[10px] text-isie-text-secondary">
              Plan details are not verified recommendations. Confirm destinations, routes, and travel times with responsible authorities.
            </p>

            <div className="space-y-2.5">
              {relocations.map((reloc) => (
                <div
                  key={reloc.zoneId}
                  className="p-3 bg-white/[0.025] hover:bg-white/[0.045] border-l-4 border-l-isie-primary/70 border-white/10 rounded-sm font-mono text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-white truncate">
                      #{reloc.priorityRank} {reloc.zoneName}
                    </span>
                    <span className="text-isie-primary font-bold shrink-0">
                      INDEX: {reloc.relocationPriorityScore}
                    </span>
                  </div>
                  <div className="text-[11px] text-isie-text-dim truncate">
                    USER-ENTERED DESTINATION: {reloc.designatedShelters[0]?.name}
                  </div>
                  <div className="text-[11px] text-emerald-400 truncate">
                    REPORTED TRANSIT: {reloc.estimatedTransitTimeHours}H VIA {reloc.evacuationRoutesIdentified[0]?.corridorName}
                  </div>
                </div>
              ))}
              {relocations.length === 0 && (
                <p className="rounded border border-white/10 p-3 font-mono text-[10px] text-isie-text-dim">
                  No verified relocation plans are available. No route or shelter recommendation is generated.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "SUMMARY" && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-xs text-isie-text-muted px-0.5">
              <span>CROSS-DOMAIN EARLY WARNING</span>
              <span className="text-slate-500 font-bold">NO LIVE ALERT FEED</span>
            </div>

            <p className="rounded border border-white/10 p-4 text-[11px] text-isie-text-secondary">
              No external hazard, forecast, or response provider is connected. No alerts, current conditions, or response instructions are available here.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/10 bg-isie-panel-light/20 flex items-center justify-between text-[11px] font-mono text-isie-text-dim shrink-0">
        <span>ASSESSMENTS: USER-ENTERED / DEMO ONLY</span>
        <Link href="/analytics" className="text-isie-cyan hover:underline font-semibold flex items-center gap-1">
          <span>DEEP ANALYTICS</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
