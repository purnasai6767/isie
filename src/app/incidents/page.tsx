"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Flame,
  Search,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  Clock,
  Layers,
  Users,
  Building,
  MapPin,
  CheckCircle2,
  Plus,
  Compass,
  Radio,
  FileText,
  AlertTriangle,
  History,
  Globe2,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { incidentService } from "@/lib/services/incidentService";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermission } from "@/lib/auth/roles";
import { IntelligenceEvent, EventStatus } from "@/lib/types/isie";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { exportIncidentReportPdf } from "@/lib/utils/exportIncidentPdf";
import { exportIncidentDataCsv } from "@/lib/utils/exportIncidentCsv";
import { IncidentMapThumbnail } from "@/components/incidents/IncidentMapThumbnail";
import Link from "next/link";

export default function IncidentsPage() {
  const { user, isDemoMode } = useAuth();
  const [incidents, setIncidents] = useState<IntelligenceEvent[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IntelligenceEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // PDF Export state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);

  // CSV Export state
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  // Map preview thumbnail toggle state
  const [showMapPreview, setShowMapPreview] = useState(false);

  // Subscribe to real-time incidents
  useEffect(() => {
    const unsubscribe = incidentService.subscribeIncidents(isDemoMode, (data) => {
      setIncidents(data);
      // Auto-select or preserve currently selected incident
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

  const canCreate = user && !isDemoMode && hasPermission(user.role, "canCreateIncident");
  const canUpdate = user && !isDemoMode && hasPermission(user.role, "canUpdateIncident");

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.eventCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.district && inc.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.state && inc.state.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSeverity = filterSeverity === "ALL" || inc.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!selectedIncident || !user || !canUpdate) return;
    setUpdatingStatus(true);
    setStatusSuccess(null);

    const res = await incidentService.updateIncidentStatus(
      selectedIncident.id,
      newStatus,
      statusNote || `Operational status transitioned to ${newStatus}.`,
      user
    );

    if (res.success) {
      setStatusSuccess(`Status updated to ${newStatus}`);
      setStatusNote("");
      setTimeout(() => setStatusSuccess(null), 3000);
    }
    setUpdatingStatus(false);
  };

  const handleExportPdf = () => {
    if (!selectedIncident) return;
    setIsGeneratingPdf(true);
    setPdfSuccess(null);
    try {
      const ok = exportIncidentReportPdf(selectedIncident, {
        officerName: user?.name,
        officerRole: user?.role,
        organization: user?.organization,
        callsign: user?.callsign,
      });
      if (ok) {
        setPdfSuccess(`PDF Downloaded: ${selectedIncident.eventCode}.pdf`);
        setTimeout(() => setPdfSuccess(null), 3500);
      }
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (!selectedIncident) return;
    setIsGeneratingCsv(true);
    setCsvSuccess(null);
    try {
      const ok = exportIncidentDataCsv(selectedIncident, {
        officerName: user?.name,
        officerRole: user?.role,
        organization: user?.organization,
        callsign: user?.callsign,
      });
      if (ok) {
        setCsvSuccess(`CSV Exported: ${selectedIncident.eventCode || selectedIncident.id}.csv`);
        setTimeout(() => setCsvSuccess(null), 3500);
      }
    } catch (err) {
      console.error("CSV export failed:", err);
    } finally {
      setIsGeneratingCsv(false);
    }
  };

  return (
    <AppShell pageTitle="Incidents // Multi-Hazard Triage & Escalation Tracking">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-isie-primary" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Active Crisis & Operational Incident Management
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Workspace-entered incident records. Alerts, risk assessments, and verification require connected source providers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TacticalBadge variant={isDemoMode ? "cyan" : "orange"} size="sm" pulse={incidents.length > 0}>
              {isDemoMode ? "DEMO EXERCISE" : "WORKSPACE REPORTS"} // {incidents.length}
            </TacticalBadge>

            <TacticalButton
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ CREATE INCIDENT</span>
            </TacticalButton>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-isie-panel border border-white/10 px-3 py-2 rounded-sm font-mono text-xs">
            <Search className="w-4 h-4 text-isie-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, district, state, code..."
              className="bg-transparent w-full text-white placeholder-isie-text-dim outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            {["ALL", "CRITICAL", "HIGH", "MODERATE", "LOW"].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                  filterSeverity === sev
                    ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                    : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid: Incident List & Detail Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
          {/* Incident List */}
          <div className="lg:col-span-5 min-w-0 space-y-3 max-h-[720px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredIncidents.length === 0 ? (
              <EmptyState
                icon="shield"
                title="No Incidents Logged"
                description={
                  isDemoMode
                    ? "No synthetic incidents match the active search or severity filter."
                    : "No incident reports are available in this workspace. Records entered here are not independently verified."
                }
                actionLabel={canCreate ? "+ CREATE INCIDENT" : undefined}
                onAction={canCreate ? () => setIsCreateModalOpen(true) : undefined}
                statusText={isDemoMode ? "SIMULATION STANDBY" : "OPERATIONAL CLEAR"}
              />
            ) : (
              filteredIncidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id;

                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`p-4 rounded-sm border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-isie-panel-elevated border-isie-primary shadow-[0_0_15px_rgba(255,122,24,0.15)]"
                        : "bg-isie-panel border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-white">{incident.eventCode}</span>
                        <TacticalBadge
                          variant={
                            incident.severity === "CRITICAL"
                              ? "critical"
                              : incident.severity === "HIGH"
                              ? "warning"
                              : "cyan"
                          }
                          size="sm"
                          pulse={incident.severity === "CRITICAL"}
                        >
                          {incident.severity}
                        </TacticalBadge>
                        <span className="text-[10px] text-isie-text-dim px-1.5 py-0.5 rounded-xs bg-white/5 border border-white/10">
                          {incident.status}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-isie-text-dim">
                        {incident.timestamp}
                      </span>
                    </div>

                    <h3 className="font-mono text-sm font-semibold text-white mb-1 leading-snug">
                      {incident.title}
                    </h3>

                    <div className="flex items-center gap-1.5 font-mono text-xs text-isie-text-muted mb-3">
                      <MapPin className="w-3 h-3 text-isie-primary shrink-0" />
                      <span className="truncate">{incident.locationName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 font-mono text-[11px]">
                      <div>
                        <span className="text-isie-text-dim block">POPULATION:</span>
                        <span className="text-white font-bold">
                          {incident.populationAtRisk.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-isie-text-dim block">RELOC. INDEX:</span>
                        <span className="text-isie-primary font-bold">
                          {incident.relocationScore || 65} / 100
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Incident Detail Inspector */}
          <div className="lg:col-span-7 min-w-0 p-4 sm:p-6 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between">
            {selectedIncident ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TacticalBadge variant="orange" size="sm">
                        {selectedIncident.eventCode}
                      </TacticalBadge>
                      <TacticalBadge
                        variant={
                          selectedIncident.severity === "CRITICAL"
                            ? "critical"
                            : selectedIncident.severity === "HIGH"
                            ? "warning"
                            : "cyan"
                        }
                        size="sm"
                      >
                        {selectedIncident.severity}
                      </TacticalBadge>
                      <TacticalBadge variant="safe" size="sm">
                        STATUS: {selectedIncident.status}
                      </TacticalBadge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-isie-cyan hidden sm:inline">
                        LAT: {selectedIncident.coordinates.lat}°N / LNG:{" "}
                        {selectedIncident.coordinates.lng}°E
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMapPreview((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs font-mono text-xs tracking-wider transition-all cursor-pointer border ${
                          showMapPreview
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-[0_0_10px_rgba(56,189,248,0.25)] font-bold"
                            : "bg-white/5 text-isie-text-muted hover:text-white border-white/10 hover:border-white/20"
                        }`}
                        title="Toggle 2D Tactical Map Thumbnail for Incident Coordinates"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>{showMapPreview ? "HIDE MAP" : "PREVIEW MAP"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mt-1">
                    <div className="min-w-0">
                      <h2 className="font-mono text-xl font-bold text-white uppercase tracking-wider">
                        {selectedIncident.title}
                      </h2>
                      <p className="text-xs text-isie-text-secondary mt-1">
                        {selectedIncident.locationName} // {selectedIncident.region || `${selectedIncident.district || "Sector"}, ${selectedIncident.state || "India"}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        onClick={handleExportCsv}
                        disabled={isGeneratingCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500/80 text-emerald-300 rounded-xs font-mono text-xs font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer"
                        title="Export Operational Incident Dataset as RFC-4180 CSV for GIS and Analytics"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isGeneratingCsv ? "GENERATING CSV..." : "EXPORT CSV"}</span>
                      </button>

                      <button
                        onClick={handleExportPdf}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-500/80 text-amber-300 rounded-xs font-mono text-xs font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] cursor-pointer"
                        title="Generate & Export Operational Incident PDF Summary Report"
                      >
                        <FileDown className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isGeneratingPdf ? "GENERATING PDF..." : "EXPORT PDF REPORT"}</span>
                      </button>
                    </div>
                  </div>

                  {(pdfSuccess || csvSuccess) && (
                    <div className="mt-2.5 p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xs font-mono text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{csvSuccess || pdfSuccess}</span>
                    </div>
                  )}
                </div>

                {/* 2D Map Thumbnail Preview */}
                {showMapPreview && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <IncidentMapThumbnail
                      incident={selectedIncident}
                      onClose={() => setShowMapPreview(false)}
                    />
                  </div>
                )}

                {/* Summary */}
                <div className="space-y-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-isie-text-muted font-semibold">
                    Situation Assessment & Evolution
                  </span>
                  <p className="text-xs text-isie-text-primary leading-relaxed bg-white/[0.02] p-3 rounded-xs border border-white/5">
                    {selectedIncident.summary}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                    <div className="text-[10px] text-isie-text-dim uppercase">EXPOSED HABITATIONS</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {selectedIncident.affectedHabitationsCount || Math.max(1, Math.round(selectedIncident.populationAtRisk / 3000))} HAMLETS
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                    <div className="text-[10px] text-isie-text-dim uppercase">POPULATION EXPOSURE</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {selectedIncident.populationAtRisk.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                    <div className="text-[10px] text-isie-text-dim uppercase">CARRYING CAPACITY</div>
                    <div className="text-lg font-bold text-red-400 mt-1">
                      {selectedIncident.carryingCapacityStatus || "CRITICAL"}
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                    <div className="text-[10px] text-isie-text-dim uppercase">RELOCATION PRIORITY</div>
                    <div className="text-lg font-bold text-isie-primary mt-1">
                      {selectedIncident.relocationScore || 85} / 100
                    </div>
                  </div>
                </div>

                {/* Extended Geographic & Impact Details */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-[11px] text-isie-text-muted uppercase font-semibold block">
                      Geographic & Infrastructure Context
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMapPreview((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[11px] font-mono bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 transition-colors cursor-pointer"
                      title="Toggle 2D Tactical Map Thumbnail"
                    >
                      <MapPin className="w-3 h-3 text-sky-400" />
                      <span>{showMapPreview ? "HIDE MAP THUMBNAIL" : "PREVIEW MAP"}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-isie-text-dim block">STATE / PROVINCE:</span>
                      <span className="text-white">{selectedIncident.state || "Uttarakhand"}</span>
                    </div>
                    <div>
                      <span className="text-isie-text-dim block">DISTRICT:</span>
                      <span className="text-white">{selectedIncident.district || "Chamoli"}</span>
                    </div>
                    <div>
                      <span className="text-isie-text-dim block">AFFECTED AREA:</span>
                      <span className="text-white">{selectedIncident.affectedAreaKm2 || "35"} km²</span>
                    </div>
                    <div>
                      <span className="text-isie-text-dim block">INFRASTRUCTURE:</span>
                      <span className="text-amber-300 truncate block">
                        {selectedIncident.infrastructureImpact || "Access corridors compromised"}
                      </span>
                    </div>
                    <div>
                      <span className="text-isie-text-dim block">FACILITIES HIT:</span>
                      <span className="text-white">
                        {selectedIncident.criticalFacilitiesAffected || 2} installations
                      </span>
                    </div>
                    <div>
                      <span className="text-isie-text-dim block">LOGGED BY:</span>
                      <span className="text-isie-cyan truncate block">
                        {selectedIncident.createdByName || "Sector Operator"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Source Verification Chains */}
                <div className="space-y-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-isie-text-muted font-semibold">
                    Fused Intelligence Sources ({selectedIncident.sourceAgencies?.length || selectedIncident.sourceCount})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(selectedIncident.sourceAgencies || ["Not provided"]).map((agency) => (
                      <span
                        key={agency}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-xs font-mono text-xs text-isie-text-secondary"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{agency}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Operational Status Adjustment (Only for Authenticated Operators) */}
                {canUpdate && (
                  <div className="p-3 bg-isie-panel-light/40 border border-white/10 rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                        Adjust Operational Posture / Status
                      </span>
                      {statusSuccess && (
                        <span className="font-mono text-xs text-emerald-400">{statusSuccess}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["ACTIVE", "MONITORING", "CONTAINED", "RESOLVED", "ARCHIVED"] as EventStatus[]).map(
                        (st) => (
                          <button
                            key={st}
                            disabled={updatingStatus || selectedIncident.status === st}
                            onClick={() => handleStatusChange(st)}
                            className={`px-2.5 py-1 rounded-xs font-mono text-[11px] uppercase border transition-colors ${
                              selectedIncident.status === st
                                ? "bg-isie-primary/20 text-isie-primary border-isie-primary/60 font-bold"
                                : "bg-white/5 border-white/10 text-isie-text-muted hover:text-white hover:border-white/20"
                            }`}
                          >
                            {st}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 font-mono">
                <ShieldAlert className="w-10 h-10 text-white/20 mb-3" />
                <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-1">
                  NO INCIDENT SELECTED
                </h4>
                <p className="text-xs text-isie-text-dim max-w-sm">
                  {isDemoMode
                    ? "Select an active incident from the list to inspect operational details."
                    : "When workspace reports are created, their entered details will appear here."
                  }
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-mono text-xs bg-isie-panel border border-white/10 text-isie-text-muted hover:text-white hover:border-white/20 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>VIEW ON 2D MAP</span>
                </Link>

                <Link
                  href="/globe"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-mono text-xs bg-isie-panel border border-white/10 text-isie-text-muted hover:text-white hover:border-white/20 transition-colors"
                >
                  <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>VIEW ON 3D GLOBE</span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedIncident && (
                  <>
                    <button
                      onClick={handleExportCsv}
                      disabled={isGeneratingCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-mono text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-300 font-bold uppercase transition-colors cursor-pointer"
                      title="Export Operational Incident Dataset as RFC-4180 CSV for GIS, Spreadsheets, and Analytics"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isGeneratingCsv ? "EXPORTING..." : "EXPORT CSV"}</span>
                    </button>

                    <button
                      onClick={handleExportPdf}
                      disabled={isGeneratingPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-mono text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-500/70 text-amber-300 font-bold uppercase transition-colors cursor-pointer"
                      title="Generate & Export Operational Incident PDF Summary Report"
                    >
                      <FileDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isGeneratingPdf ? "EXPORTING..." : "EXPORT PDF"}</span>
                    </button>
                  </>
                )}
                <Link href="/decision-support">
                  <TacticalButton variant="primary" size="sm">
                    MOBILIZE RELOCATION ASSETS
                  </TacticalButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newId) => {
          // Select newly created incident when list refreshes
          setTimeout(() => {
            const found = incidents.find((i) => i.id === newId);
            if (found) setSelectedIncident(found);
          }, 300);
        }}
      />
    </AppShell>
  );
}
