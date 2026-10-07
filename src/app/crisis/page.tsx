"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Flame,
  Search,
  Filter,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  Clock,
  Layers,
  MapPin,
  Users,
  Compass,
  FileCheck2,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { incidentService } from "@/lib/services/incidentService";
import { IntelligenceEvent, EventStatus } from "@/lib/types/isie";
import { hasPermission } from "@/lib/auth/roles";

export default function CrisisIntelligencePage() {
  const { user, isDemoMode } = useAuth();
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IntelligenceEvent | null>(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = incidentService.subscribeIncidents(isDemoMode, (data) => {
      setIncidents(data);
      setSelectedIncident((prev) => {
        if (!prev && data.length > 0) return data[0];
        if (prev) {
          const updated = data.find((d) => d.id === prev.id);
          return updated || (data.length > 0 ? data[0] : null);
        }
        return null;
      });
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isDemoMode]);

  const categories = [
    { id: "ALL", label: "All Categories" },
    { id: "HYDROMETEOROLOGICAL", label: "Hydrometeorological" },
    { id: "GEOPHYSICAL", label: "Geophysical" },
    { id: "STRUCTURAL_INFRASTRUCTURE", label: "Infrastructure & Dam" },
    { id: "RELOCATION_DISPLACEMENT", label: "Habitation Relocation" },
  ];

  const filteredIncidents = incidents.filter((inc) => {
    const matchesCategory =
      activeCategory === "ALL" || inc.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inc.title.toLowerCase().includes(q) ||
      inc.eventCode.toLowerCase().includes(q) ||
      inc.locationName.toLowerCase().includes(q) ||
      inc.region.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const canUpdate = user && !isDemoMode && hasPermission(user.role, "canUpdateIncident");

  const handleUpdateStatus = async (newStatus: EventStatus) => {
    if (!selectedIncident || !user || !canUpdate) return;
    const res = await incidentService.updateIncidentStatus(
      selectedIncident.id,
      newStatus,
      `Triage status changed to ${newStatus}`,
      user
    );
    if (res.success) {
      setStatusMessage(`Incident updated to ${newStatus}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;
  const totalAtRisk = incidents.reduce((acc, curr) => acc + curr.populationAtRisk, 0);

  return (
    <AppShell pageTitle="Crisis Intelligence // Active Incidents & Escalation Triage">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-isie-primary" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Crisis & Incident Intelligence
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Workspace incident reports and user-entered status. No real-time hazard provider or automatic risk assessment is connected.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <TacticalBadge variant="critical" size="sm" pulse={criticalCount > 0}>
              {criticalCount} CRITICAL ESCALATIONS
            </TacticalBadge>
            <TacticalBadge variant={isDemoMode ? "cyan" : "orange"} size="sm">
              {incidents.length} TOTAL LOGGED
            </TacticalBadge>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-isie-panel border border-white/10 px-3 py-2 rounded-sm font-mono text-xs">
            <Search className="w-4 h-4 text-isie-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by incident code, location, or basin..."
              className="bg-transparent w-full text-white placeholder-isie-text-dim outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xs font-mono text-xs uppercase tracking-wider transition-colors border ${
                  activeCategory === cat.id
                    ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                    : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {statusMessage && (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xs text-emerald-300 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Main Triage View Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
          {/* Left: Incident Feed (5 cols) */}
          <div className="lg:col-span-5 min-w-0 space-y-3 max-h-[680px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredIncidents.length === 0 ? (
              <EmptyState
                icon="shield"
                title="No Matching Crises"
                description={
                  searchQuery
                    ? "No incidents match your search query."
                    : "No crisis events logged in this category."
                }
                statusText="SYSTEM IDLE"
              />
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCritical = inc.severity === "CRITICAL";
                const isHigh = inc.severity === "HIGH";

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-sm border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-isie-panel-elevated border-isie-primary shadow-[0_0_15px_rgba(255,122,24,0.2)]"
                        : "bg-isie-panel border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-white">{inc.eventCode}</span>
                        <TacticalBadge
                          variant={isCritical ? "critical" : isHigh ? "orange" : "cyan"}
                          size="sm"
                          pulse={isCritical}
                        >
                          {inc.severity}
                        </TacticalBadge>
                        <span className="text-[10px] text-isie-text-dim">[{inc.status}]</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        IDX: {inc.relocationScore}
                      </span>
                    </div>

                    <h3 className="font-mono text-xs font-semibold text-white mb-2 leading-snug line-clamp-2">
                      {inc.title}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] font-mono text-isie-text-secondary pt-2 border-t border-white/5">
                      <span className="truncate max-w-[200px]">{inc.locationName}</span>
                      <span className="text-amber-300 font-semibold shrink-0">
                        {inc.populationAtRisk.toLocaleString()} REPORTED
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Incident Detail & Escalation Inspector (7 cols) */}
          <div className="lg:col-span-7 min-w-0 p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-5">
            {selectedIncident ? (
              <div className="space-y-5 font-mono text-xs">
                {/* Header Information */}
                <div className="pb-4 border-b border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white tracking-wider">
                        {selectedIncident.eventCode}
                      </span>
                      <TacticalBadge
                        variant={
                          selectedIncident.severity === "CRITICAL"
                            ? "critical"
                            : selectedIncident.severity === "HIGH"
                            ? "orange"
                            : "cyan"
                        }
                        size="sm"
                      >
                        {selectedIncident.severity} // {selectedIncident.status}
                      </TacticalBadge>
                      <TacticalBadge variant="muted" size="sm">
                        {selectedIncident.category}
                      </TacticalBadge>
                    </div>
                    <span className="text-[11px] text-isie-text-dim">
                      {selectedIncident.timestamp}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-white leading-snug mb-2">
                    {selectedIncident.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-isie-text-secondary">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-isie-cyan" />
                      <span>{selectedIncident.locationName}</span>
                    </div>
                    <span className="text-white/20">|</span>
                    <span className="text-isie-cyan">
                      {selectedIncident.coordinates.lat.toFixed(4)}°N, {selectedIncident.coordinates.lng.toFixed(4)}°E
                      {selectedIncident.coordinates.elevationMeters
                        ? ` (${selectedIncident.coordinates.elevationMeters}m MSL)`
                        : ""}
                    </span>
                  </div>
                </div>

                {/* Situation Summary */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs space-y-1">
                  <span className="text-[10px] text-isie-text-dim uppercase tracking-wider block font-semibold">
                    SITUATION INTELLIGENCE SUMMARY
                  </span>
                  <p className="text-xs text-isie-text-secondary leading-relaxed">
                    {selectedIncident.summary}
                  </p>
                </div>

                {/* Quantitative Impact & Carrying Capacity Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xs">
                    <span className="text-[9px] text-isie-text-dim block uppercase">POPULATION AT RISK</span>
                    <span className="text-base font-bold text-amber-300">
                      {selectedIncident.populationAtRisk.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xs">
                    <span className="text-[9px] text-isie-text-dim block uppercase">HABITATIONS</span>
                    <span className="text-base font-bold text-white">
                      {selectedIncident.affectedHabitationsCount || 14}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xs">
                    <span className="text-[9px] text-isie-text-dim block uppercase">RELOCATION SCORE</span>
                    <span className="text-base font-bold text-isie-primary">
                      {selectedIncident.relocationScore} <span className="text-xs font-normal text-white/50">/ 100</span>
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xs">
                    <span className="text-[9px] text-isie-text-dim block uppercase">ESCALATION RISK</span>
                    <span
                      className={`text-base font-bold ${
                        selectedIncident.escalationRisk === "EXTREME"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {selectedIncident.escalationRisk || "HIGH"}
                    </span>
                  </div>
                </div>

                {/* Multi-Source Verification Pipeline */}
                <div className="space-y-2">
                  <span className="text-[10px] text-isie-text-dim uppercase tracking-wider block font-semibold">
                    USER-ENTERED SOURCE NOTES ({selectedIncident.sourceAgencies?.length || selectedIncident.sourceCount || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedIncident.sourceAgencies || []).map(
                      (agency) => (
                        <span
                          key={agency}
                          className="px-2 py-1 bg-sky-950/40 border border-sky-500/30 text-sky-200 text-[10px] rounded-xs font-semibold"
                        >
                          ✓ {agency}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/geospatial"
                      className="px-3 py-1.5 bg-isie-primary hover:bg-orange-500 text-black font-bold uppercase rounded-xs text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>INSPECT ON SITUATION MAP</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href="/globe"
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold uppercase rounded-xs text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>3D GLOBE</span>
                      <Compass className="w-3.5 h-3.5 text-isie-cyan" />
                    </Link>
                  </div>

                  {canUpdate && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus("MONITORING")}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xs text-[11px] border border-white/10 uppercase"
                      >
                        SET MONITORING
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("CONTAINED")}
                        className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 rounded-xs text-[11px] uppercase font-bold"
                      >
                        CONTAINED
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon="radio"
                title="Select an Incident to Inspect Evidence & Escalation Risk"
                description="When an active crisis event is selected, this module displays multi-source evidence, satellite verification layers, population at risk, carrying capacity metrics, and designated evacuation corridors."
                statusText="AWAITING SELECTION"
                actionText="EXPLORE GEOSPATIAL MAP"
                actionHref="/geospatial"
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
